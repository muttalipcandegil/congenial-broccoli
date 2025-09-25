import json
import re
import time
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from selenium.webdriver.common.by import By

from bs4 import BeautifulSoup

import tldextract


class AnalyzeRequest(BaseModel):
    url: HttpUrl


class GatespyAnalyzer:
    def __init__(self) -> None:
        pass

    def _build_driver(self) -> webdriver.Chrome:
        caps = DesiredCapabilities.CHROME.copy()
        caps["goog:loggingPrefs"] = {"performance": "ALL"}
        options = Options()
        options.add_argument("--headless=new")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--ignore-certificate-errors")
        options.add_argument("--enable-unsafe-swiftshader")
        options.add_argument("--disable-web-security")
        options.add_argument("--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
        driver = webdriver.Chrome(options=options, desired_capabilities=caps)
        return driver

    def _extract_performance_logs(self, driver: webdriver.Chrome) -> List[Dict[str, Any]]:
        logs = driver.get_log("performance")
        entries = []
        for log in logs:
            try:
                entries.append(json.loads(log["message"])["message"])
            except Exception:
                continue
        return entries

    def _collect_network(self, perf_entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        requests: List[Dict[str, Any]] = []
        headers_map: Dict[str, Dict[str, Any]] = {}
        csp_headers: List[str] = []
        cdn_providers: List[str] = []

        for e in perf_entries:
            method = e.get("method", "")
            params = e.get("params", {})
            if method == "Network.requestWillBeSent":
                req = {
                    "requestId": params.get("requestId"),
                    "url": params.get("request", {}).get("url"),
                    "method": params.get("request", {}).get("method"),
                    "headers": params.get("request", {}).get("headers", {}),
                    "initiator": params.get("initiator", {}),
                    "timestamp": params.get("timestamp"),
                    "type": params.get("type"),
                }
                requests.append(req)
            elif method == "Network.responseReceived":
                response = params.get("response", {})
                url = response.get("url", "")
                request_id = params.get("requestId")
                headers_map[request_id] = {
                    "url": url,
                    "status": response.get("status"),
                    "headers": response.get("headers", {}),
                    "mimeType": response.get("mimeType"),
                    "remoteIPAddress": response.get("remoteIPAddress"),
                    "protocol": response.get("protocol"),
                }
                # CSP headers
                hdrs = response.get("headers", {}) or {}
                for k, v in hdrs.items():
                    if k.lower() == "content-security-policy":
                        csp_headers.append(str(v))
                # CDN heuristics
                server = (hdrs.get("server") or hdrs.get("Server") or "").lower()
                cf_ray = hdrs.get("cf-ray") or hdrs.get("CF-RAY")
                via = (hdrs.get("via") or hdrs.get("Via") or "").lower()
                x_served_by = (hdrs.get("x-served-by") or hdrs.get("X-Served-By") or "").lower()
                if "cloudflare" in server or cf_ray:
                    cdn_providers.append("Cloudflare")
                if "akami" in server or "akamai" in via or "akamaized" in url:
                    cdn_providers.append("Akamai")
                if "fastly" in server or "fastly" in via or "fastly" in x_served_by:
                    cdn_providers.append("Fastly")
                if "cachefly" in server or "cachefly" in via:
                    cdn_providers.append("CacheFly")
                if "cloudfront" in server or "cloudfront" in via or "amazon" in server:
                    cdn_providers.append("AWS CloudFront")

        # de-duplicate cdn providers
        cdn_providers = sorted(list(set(cdn_providers)))
        return {"requests": requests, "responses": headers_map, "csp": csp_headers, "cdn": cdn_providers}

    def _detect_payment_providers(self, html: str, network: Dict[str, Any]) -> Dict[str, Any]:
        providers = set()
        stripe_public_keys: List[str] = []

        patterns = {
            "Stripe": [r"stripe\.com", r"js\.stripe\.com", r"stripe\.js", r"pk_(live|test)_[A-Za-z0-9]{20,}"],
            "PayPal": [r"paypal\.com", r"www\.paypalobjects\.com", r"paypalbuttons"],
            "Adyen": [r"checkoutshopper(-sandbox)?\.adyen\.com", r"adyen\.com"],
            "Braintree": [r"braintreepayments\.com", r"braintreegateway\.com"],
            "Checkout.com": [r"checkout\.com", r"checkoutjs"],
            "Klarna": [r"klarna\.com", r"x-klarna"],
            "Apple Pay": [r"apple-pay", r"applepay"],
            "Google Pay": [r"google\.com/pay", r"pay\.google\.com"],
            "Razorpay": [r"razorpay\.com"],
            "PayU": [r"payu\.", r"secure\.payu\."],
        }

        sources = [html]
        # include network URLs
        for req in network.get("requests", []):
            if req.get("url"):
                sources.append(req["url"])
        for resp in network.get("responses", {}).values():
            if resp.get("url"):
                sources.append(resp["url"])

        full_blob = "\n".join(sources)

        for name, pats in patterns.items():
            for pat in pats:
                if re.search(pat, full_blob, flags=re.IGNORECASE):
                    providers.add(name)

        # Stripe public keys
        for m in re.finditer(r"pk_(?:live|test)_[A-Za-z0-9]{20,}", full_blob):
            stripe_public_keys.append(m.group(0))

        return {"providers": sorted(list(providers)), "stripe_public_keys": sorted(list(set(stripe_public_keys)))}

    def _detect_payment_methods(self, html: str, network: Dict[str, Any]) -> List[str]:
        methods = set()
        blob = html + "\n" + "\n".join([req.get("url", "") or "" for req in network.get("requests", [])])

        hints = {
            "Credit Card": [r"cardnumber", r"expir(y|ation)", r"cvc", r"pan", r"cardholder"],
            "Apple Pay": [r"apple\s*pay", r"ApplePaySession"],
            "Google Pay": [r"google\s*pay", r"paymentsclient"],
            "PayPal": [r"paypal", r"PayPalButton"],
            "SEPA": [r"sepa"],
            "iDEAL": [r"ideal"],
            "Bancontact": [r"bancontact"],
            "Giropay": [r"giropay"],
            "EPS": [r"\beps\b"],
            "P24": [r"przelewy24", r"\bp24\b"],
            "Sofort": [r"sofort"],
            "Afterpay": [r"afterpay"],
            "Klarna": [r"\bklarna\b"],
            "Boleto": [r"boleto"],
        }

        for name, pats in hints.items():
            for pat in pats:
                if re.search(pat, blob, flags=re.IGNORECASE):
                    methods.add(name)

        return sorted(list(methods))

    def _detect_security(self, html: str, network: Dict[str, Any], url: str) -> Dict[str, Any]:
        sec = {
            "https": url.lower().startswith("https://"),
            "recaptcha": bool(re.search(r"recaptcha", html, re.IGNORECASE)),
            "cloudflare_protection": False,
            "bot_protection": False,
            "three_d_secure": bool(re.search(r"3d\s*secure|three[-\s]*d", html, re.IGNORECASE)),
        }
        # Cloudflare heuristics
        blob = html + "\n" + "\n".join([req.get("url", "") or "" for req in network.get("requests", [])])
        if re.search(r"cloudflare", blob, re.IGNORECASE) or any("Cloudflare" in p for p in network.get("cdn", [])):
            sec["cloudflare_protection"] = True

        # Bot protection heuristics
        if re.search(r"(hcaptcha|perimeterx|datadome|arkose|fingerprintjs)", blob, re.IGNORECASE):
            sec["bot_protection"] = True

        return sec

    def _detect_libraries(self, html: str, scripts: List[str]) -> List[str]:
        libs = set()
        blob = html + "\n" + "\n".join(scripts)
        patterns = {
            "React": [r"react", r"data-reactroot"],
            "Vue": [r"vue(\.js)?", r"__vue__"],
            "Angular": [r"angular(\.js)?", r"ng-app", r"ng-controller"],
            "jQuery": [r"jquery(\.js)?", r"\$\("],
            "Next.js": [r"next/dist", r"__NEXT_DATA__"],
        }
        for name, pats in patterns.items():
            for pat in pats:
                if re.search(pat, blob, flags=re.IGNORECASE):
                    libs.add(name)
        return sorted(list(libs))

    def _detect_analytics(self, html: str, network: Dict[str, Any]) -> List[str]:
        providers = set()
        blob = html + "\n" + "\n".join([req.get("url", "") or "" for req in network.get("requests", [])])
        patterns = {
            "Google Analytics": [r"www\.google-analytics\.com", r"gtag\\(", r"ga\\("],
            "Google Tag Manager": [r"googletagmanager\.com"],
            "Meta Pixel": [r"connect\.facebook\.net", r"fbq\\("],
            "Segment": [r"cdn\.segment\.com", r"api\.segment\.io"],
            "Mixpanel": [r"mixpanel\.com"],
            "Hotjar": [r"hotjar\.com"],
            "Amplitude": [r"amplitude\.com"],
        }
        for name, pats in patterns.items():
            for pat in pats:
                if re.search(pat, blob, flags=re.IGNORECASE):
                    providers.add(name)
        return sorted(list(providers))

    def _csp_settings(self, html: str, network: Dict[str, Any]) -> Dict[str, Any]:
        soup = BeautifulSoup(html, "html.parser")
        meta_csp = []
        for m in soup.find_all("meta"):
            if m.get("http-equiv", "").lower() == "content-security-policy":
                meta_csp.append(m.get("content") or "")
        headers_csp = network.get("csp", [])
        return {"meta": meta_csp, "headers": headers_csp}

    def _country_currency(self, html: str) -> Dict[str, Any]:
        currencies = set()
        for sym in ["$", "€", "£", "¥", "₹", "₩", "₺", "₽", "₴", "₫", "฿", "₦", "₱"]:
            if sym in html:
                currencies.add(sym)
        # Basic locale detection
        locales = set()
        for loc in ["en-US", "en-GB", "en", "de-DE", "fr-FR", "es-ES", "it-IT", "pt-BR", "tr-TR", "ru-RU"]:
            if loc in html:
                locales.add(loc)
        return {"currencies": sorted(list(currencies)), "locales": sorted(list(locales))}

    def _fonts(self, html: str, scripts: List[str]) -> List[str]:
        providers = set()
        blob = html + "\n" + "\n".join(scripts)
        if re.search(r"fonts\.googleapis\.com|fonts\.gstatic\.com", blob):
            providers.add("Google Fonts")
        if re.search(r"use\.typekit\.net", blob):
            providers.add("Adobe Typekit")
        if re.search(r"fonts\.akamaihd\.net", blob):
            providers.add("Akamai Fonts CDN")
        return sorted(list(providers))

    def _hidden_fields(self, html: str) -> List[Dict[str, Any]]:
        soup = BeautifulSoup(html, "html.parser")
        hidden_inputs = []
        for inp in soup.find_all("input", {"type": "hidden"}):
            hidden_inputs.append({
                "name": inp.get("name"),
                "id": inp.get("id"),
                "value": inp.get("value"),
            })
        return hidden_inputs

    def _cookies(self, driver: webdriver.Chrome) -> List[Dict[str, Any]]:
        cookies = driver.get_cookies()
        for c in cookies:
            # prune large values
            if c.get("value") and len(c["value"]) > 200:
                c["value"] = c["value"][:200] + "...(truncated)"
        return cookies

    def _performance_metrics(self, driver: webdriver.Chrome) -> Dict[str, Any]:
        # Use Performance API
        perf = driver.execute_script(
            "return {"
            "  timing: performance.timing,"
            "  nav: performance.getEntriesByType('navigation'),"
            "  res: performance.getEntriesByType('resource').slice(0, 200)"
            "};"
        )
        return perf

    def analyze(self, url: str) -> Dict[str, Any]:
        driver = self._build_driver()
        try:
            start = time.time()
            driver.get(url)
            # wait a bit for JS
            time.sleep(3.5)

            html = driver.page_source

            # collect script srcs
            scripts = [el.get_attribute("src") or "" for el in driver.find_elements(By.TAG_NAME, "script")]

            perf_entries = self._extract_performance_logs(driver)
            network = self._collect_network(perf_entries)

            # Build the report
            payment = self._detect_payment_providers(html, network)
            payment_methods = self._detect_payment_methods(html, network)
            security = self._detect_security(html, network, url)
            libraries = self._detect_libraries(html, scripts)
            analytics = self._detect_analytics(html, network)
            csp = self._csp_settings(html, network)
            cc = self._country_currency(html)
            fonts = self._fonts(html, scripts)
            hidden = self._hidden_fields(html)
            cookies = self._cookies(driver)
            perf = self._performance_metrics(driver)

            # Domain info
            ext = tldextract.extract(url)
            domain = ".".join(part for part in [ext.subdomain, ext.domain, ext.suffix] if part)

            report = {
                "gatespy_version": "0.1.0",
                "target": {
                    "url": url,
                    "domain": domain,
                },
                "html_size": len(html),
                "scripts_count": len([s for s in scripts if s]),
                "payment": payment,
                "payment_methods": payment_methods,
                "security": security,
                "libraries": libraries,
                "analytics": analytics,
                "csp": csp,
                "country_currency": cc,
                "fonts": fonts,
                "hidden_fields": hidden,
                "cookies": cookies,
                "network": {
                    "request_count": len(network.get("requests", [])),
                    "cdn_providers": network.get("cdn", []),
                    "sample_requests": network.get("requests", [])[:50],
                },
                "performance": perf,
                "generated_at": time.time(),
                "duration_seconds": time.time() - start,
            }
            return report
        finally:
            try:
                driver.quit()
            except Exception:
                pass


app = FastAPI(title="Gatespy Analyzer", version="0.1.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def index():
    return {
        "name": "Gatespy Analyzer",
        "status": "ok",
        "endpoints": {
            "health": "/health",
            "analyze": "POST /analyze { url: 'https://...' }",
            "docs": "/docs"
        }
    }

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    analyzer = GatespyAnalyzer()
    try:
        return analyzer.analyze(req.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}