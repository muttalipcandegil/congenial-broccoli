"use client";

import { useState } from "react";
import useSWRMutation from "swr/mutation";
import { Download, Globe, ShieldCheck, Wallet, Network, FileJson } from "lucide-react";

async function analyzeFetcher(url: string, { arg }: { arg: { url: string } }) {
  const res = await fetch(`/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });
  if (!res.ok) throw new Error(`Analyzer error: ${await res.text()}`);
  return res.json();
}

export default function Home() {
  const [inputUrl, setInputUrl] = useState("");
  const { trigger, data, isMutating, error } = useSWRMutation(`/api/analyze`, analyzeFetcher);

  const handleAnalyze = async () => {
    if (!inputUrl) return;
    try {
      await trigger({ url: inputUrl });
    } catch (e) {
      // swallow
    }
  };

  const downloadJson = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gatespy-report.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="container mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
          <Globe className="w-8 h-8 text-gatespy-300" />
          Gatespy
        </h1>
        <p className="text-gatespy-100 mt-2">Checkout / ödeme linklerini derinlemesine analiz eden dashboard.</p>
      </header>

      <section className="bg-white/10 backdrop-blur rounded-2xl p-6 shadow-xl">
        <div className="flex gap-3">
          <input
            className="flex-1 rounded-xl px-4 py-3 text-black"
            placeholder="Checkout URL girin (https://...)"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
          <button
            className="px-6 py-3 rounded-xl bg-gatespy-300 text-black font-semibold hover:bg-gatespy-200 transition"
            onClick={handleAnalyze}
            disabled={isMutating}
          >
            {isMutating ? "Analiz ediliyor..." : "Analiz Et"}
          </button>
        </div>
        {error && <p className="text-red-200 mt-3">Hata: {String(error.message || error)}</p>}
      </section>

      {data && (
        <>
          <section className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl flex items-center gap-2"><Wallet className="w-5 h-5" /> Ödeme Sağlayıcıları</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.payment?.providers?.length
                  ? data.payment.providers.map((p: string) => (
                      <span key={p} className="px-3 py-1 bg-gatespy-500/60 rounded-full">{p}</span>
                    ))
                  : <span className="text-gatespy-100">Bulunamadı</span>
                }
              </div>
              {data.payment?.stripe_public_keys?.length ? (
                <div className="mt-4">
                  <h3 className="font-semibold">Stripe Public Keys</h3>
                  <ul className="list-disc list-inside text-sm mt-2">
                    {data.payment.stripe_public_keys.map((k: string) => <li key={k} className="break-all">{k}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Güvenlik</h2>
              <ul className="mt-3 space-y-2">
                <li>HTTPS: {data.security?.https ? "✅" : "⚠️"}</li>
                <li>reCAPTCHA: {data.security?.recaptcha ? "✅" : "❌"}</li>
                <li>Cloudflare: {data.security?.cloudflare_protection ? "✅" : "❌"}</li>
                <li>Bot koruma: {data.security?.bot_protection ? "✅" : "❌"}</li>
                <li>3D Secure: {data.security?.three_d_secure ? "✅" : "❌"}</li>
              </ul>
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">Ödeme Yöntemleri</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.payment_methods?.length
                  ? data.payment_methods.map((m: string) => (
                      <span key={m} className="px-3 py-1 bg-gatespy-500/60 rounded-full">{m}</span>
                    ))
                  : <span className="text-gatespy-100">Bulunamadı</span>
                }
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">Kütüphaneler</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.libraries?.length
                  ? data.libraries.map((m: string) => (
                      <span key={m} className="px-3 py-1 bg-gatespy-500/60 rounded-full">{m}</span>
                    ))
                  : <span className="text-gatespy-100">Bulunamadı</span>
                }
              </div>
            </div>
          </section>

          <section className="mt-8 bg-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-xl flex items-center gap-2"><Network className="w-5 h-5" /> Ağ İstekleri (örnek)</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="px-2 py-2">Method</th>
                    <th className="px-2 py-2">URL</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.network?.sample_requests?.map((r: any) => {
                    const resp = r.requestId ? data.network?.responses?.[r.requestId] : null;
                    return (
                      <tr key={r.requestId || r.url} className="border-t border-white/10">
                        <td className="px-2 py-2">{r.method}</td>
                        <td className="px-2 py-2 max-w-[500px] truncate"><a className="underline" target="_blank" href={r.url}>{r.url}</a></td>
                        <td className="px-2 py-2">{r.type}</td>
                        <td className="px-2 py-2">{resp?.status ?? "-"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">Analitik / İzleme</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.analytics?.length
                  ? data.analytics.map((m: string) => <span key={m} className="px-3 py-1 bg-gatespy-500/60 rounded-full">{m}</span>)
                  : <span className="text-gatespy-100">Bulunamadı</span>
                }
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">CSP Ayarları</h2>
              <div className="mt-3">
                <h3 className="font-semibold">Meta</h3>
                <pre className="text-xs whitespace-pre-wrap">{(data.csp?.meta || []).join("\n") || "Yok"}</pre>
                <h3 className="font-semibold mt-3">Headers</h3>
                <pre className="text-xs whitespace-pre-wrap">{(data.csp?.headers || []).join("\n") || "Yok"}</pre>
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">Ülke / Para Birimi</h2>
              <p className="mt-3 text-sm">Para birimleri: {(data.country_currency?.currencies || []).join(", ") || "Yok"}</p>
              <p className="mt-1 text-sm">Locale'lar: {(data.country_currency?.locales || []).join(", ") || "Yok"}</p>
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">Fontlar</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.fonts?.length
                  ? data.fonts.map((m: string) => <span key={m} className="px-3 py-1 bg-gatespy-500/60 rounded-full">{m}</span>)
                  : <span className="text-gatespy-100">Bulunamadı</span>
                }
              </div>
            </div>
          </section>

          <section className="mt-8 grid md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">Gizli Form Alanları</h2>
              <div className="mt-3">
                {data.hidden_fields?.length ? (
                  <ul className="text-sm space-y-2">
                    {data.hidden_fields.map((h: any, idx: number) => (
                      <li key={idx} className="border border-white/10 rounded p-2">
                        <div>name: {h.name || "-"}</div>
                        <div>id: {h.id || "-"}</div>
                        <div>value: {h.value || "-"}</div>
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-gatespy-100">Yok</span>}
              </div>
            </div>

            <div className="bg-white/10 rounded-2xl p-6">
              <h2 className="font-bold text-xl">Cookie'ler</h2>
              <div className="mt-3">
                {data.cookies?.length ? (
                  <ul className="text-sm space-y-2">
                    {data.cookies.map((c: any, idx: number) => (
                      <li key={idx} className="border border-white/10 rounded p-2">
                        <div><span className="font-semibold">{c.name}</span> = {c.value}</div>
                        <div>domain: {c.domain} path: {c.path} secure: {String(c.secure)}</div>
                        <div>httpOnly: {String(c.httpOnly)} sameSite: {c.sameSite || "-"}</div>
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-gatespy-100">Yok</span>}
              </div>
            </div>
          </section>

          <section className="mt-8 bg-white/10 rounded-2xl p-6">
            <h2 className="font-bold text-xl flex items-center gap-2"><FileJson className="w-5 h-5" /> Özet Rapor</h2>
            <div className="mt-3">
              <button
                className="px-4 py-2 rounded bg-gatespy-400 text-black font-semibold hover:bg-gatespy-300 transition flex items-center gap-2"
                onClick={downloadJson}
              >
                <Download className="w-4 h-4" /> JSON indir
              </button>
              <pre className="mt-4 text-xs bg-black/30 rounded p-4 overflow-auto max-h-[400px]">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </section>
        </>
      )}
    </main>
  );
}