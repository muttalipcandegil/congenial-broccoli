"use client";

import { useState } from "react";
import useSWRMutation from "swr/mutation";
import { Download, Globe, ShieldCheck, Wallet, Network, FileJson, Timer, FileCode2, Server, Link2 } from "lucide-react";
import Section from "@/components/Section";
import StatCard from "@/components/StatCard";

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
      // ignore
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
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-gatespy-800/60 via-gatespy-700/60 to-violet-700/50 p-8 border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-3">
              <Globe className="w-10 h-10 text-gatespy-300" />
              Gatespy
            </h1>
            <p className="text-white/80 mt-3 max-w-2xl">
              Checkout / ödeme linklerini derinlemesine analiz eden canlı ve renkli bir dashboard.
              HTML, JS, ağ istekleri, güvenlik ve daha fazlasını tek tıkla raporlar.
            </p>
          </div>
          <div className="w-full md:w-[26rem]">
            <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-4 shadow-xl">
              <label className="text-sm text-white/70">Checkout URL</label>
              <div className="mt-2 flex gap-2">
                <input
                  className="flex-1 rounded-xl px-4 py-3 bg-white text-black focus:outline-none focus:ring-4 focus:ring-gatespy-400/40 shadow-inner"
                  placeholder="https://..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                />
                <button
                  className="px-5 py-3 rounded-xl bg-gatespy-400 text-black font-semibold hover:bg-gatespy-300 transition shadow-lg shadow-gatespy-400/30"
                  onClick={handleAnalyze}
                  disabled={isMutating}
                >
                  {isMutating ? "Analiz..." : "Analiz Et"}
                </button>
              </div>
              {error && <p className="text-red-300 mt-2 text-sm">Hata: {String((error as any)?.message || error)}</p>}
              {isMutating && (
                <div className="mt-3 text-sm text-white/80 flex items-center gap-2">
                  <span className="loader inline-block h-3 w-3 rounded-full bg-gatespy-300 animate-pulse" />
                  Analiz başlatıldı, sayfa yükleniyor ve ağ verileri toplanıyor...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {data && (
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <StatCard label="Hedef URL" value={<span className="text-base break-all inline-flex items-center gap-2"><Link2 className="w-5 h-5 text-gatespy-300" /> {data?.target?.url}</span>} />
          <StatCard label="Domain" value={<span className="text-base">{data?.target?.domain}</span>} />
          <StatCard label="İstek Sayısı" value={<span className="inline-flex items-center gap-2"><Server className="w-5 h-5 text-gatespy-300" /> {data?.network?.request_count ?? "-"}</span>} />
          <StatCard label="Süre (sn)" value={<span className="inline-flex items-center gap-2"><Timer className="w-5 h-5 text-gatespy-300" /> {(data?.duration_seconds ?? 0).toFixed(2)}</span>} />
        </div>
      )}

      {/* Sections */}
      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Section title="Ödeme Sağlayıcıları" icon={<Wallet className="w-5 h-5" />}>
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.payment?.providers?.length
              ? data.payment.providers.map((p: string) => (
                  <span key={p} className="px-3 py-1 rounded-full bg-gradient-to-r from-gatespy-500/70 to-violet-500/70 border border-white/10">{p}</span>
                ))
              : <span className="text-white/70">Henüz analiz yok veya bulunamadı</span>
            }
          </div>
          {data?.payment?.stripe_public_keys?.length ? (
            <div className="mt-4">
              <h3 className="font-semibold">Stripe Public Keys</h3>
              <ul className="list-disc list-inside text-sm mt-2">
                {data.payment.stripe_public_keys.map((k: string) => <li key={k} className="break-all">{k}</li>)}
              </ul>
            </div>
          ) : null}
        </Section>

        <Section title="Güvenlik" icon={<ShieldCheck className="w-5 h-5" />}>
          <ul className="mt-3 space-y-2">
            <li>HTTPS: {data?.security?.https ? "✅" : "⚠️"}</li>
            <li>reCAPTCHA: {data?.security?.recaptcha ? "✅" : "❌"}</li>
            <li>Cloudflare: {data?.security?.cloudflare_protection ? "✅" : "❌"}</li>
            <li>Bot koruma: {data?.security?.bot_protection ? "✅" : "❌"}</li>
            <li>3D Secure: {data?.security?.three_d_secure ? "✅" : "❌"}</li>
          </ul>
        </Section>

        <Section title="Ödeme Yöntemleri">
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.payment_methods?.length
              ? data.payment_methods.map((m: string) => (
                  <span key={m} className="px-3 py-1 rounded-full bg-gradient-to-r from-gatespy-500/70 to-fuchsia-500/70 border border-white/10">{m}</span>
                ))
              : <span className="text-white/70">Henüz analiz yok veya bulunamadı</span>
            }
          </div>
        </Section>

        <Section title="Kütüphaneler">
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.libraries?.length
              ? data.libraries.map((m: string) => (
                  <span key={m} className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500/70 to-cyan-500/70 border border-white/10">{m}</span>
                ))
              : <span className="text-white/70">Henüz analiz yok veya bulunamadı</span>
            }
          </div>
        </Section>
      </div>

      <div className="mt-8">
        <Section title="Ağ İstekleri (örnek)" icon={<Network className="w-5 h-5" />}>
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
                {data?.network?.sample_requests?.map((r: any) => {
                  const resp = r.requestId ? data?.network?.responses?.[r.requestId] : null;
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
        </Section>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Section title="Analitik / İzleme">
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.analytics?.length
              ? data.analytics.map((m: string) => <span key={m} className="px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/70 to-violet-500/70 border border-white/10">{m}</span>)
              : <span className="text-white/70">Henüz analiz yok veya bulunamadı</span>
            }
          </div>
        </Section>

        <Section title="CSP Ayarları">
          <div className="mt-3">
            <h3 className="font-semibold">Meta</h3>
            <pre className="text-xs whitespace-pre-wrap bg-black/30 rounded p-3">{(data?.csp?.meta || []).join("\n") || "Yok"}</pre>
            <h3 className="font-semibold mt-3">Headers</h3>
            <pre className="text-xs whitespace-pre-wrap bg-black/30 rounded p-3">{(data?.csp?.headers || []).join("\n") || "Yok"}</pre>
          </div>
        </Section>

        <Section title="Ülke / Para Birimi">
          <p className="mt-3 text-sm">Para birimleri: {(data?.country_currency?.currencies || []).join(", ") || "Yok"}</p>
          <p className="mt-1 text-sm">Locale'lar: {(data?.country_currency?.locales || []).join(", ") || "Yok"}</p>
        </Section>

        <Section title="Fontlar">
          <div className="mt-3 flex flex-wrap gap-2">
            {data?.fonts?.length
              ? data.fonts.map((m: string) => <span key={m} className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/70 to-teal-500/70 border border-white/10">{m}</span>)
              : <span className="text-white/70">Henüz analiz yok veya bulunamadı</span>
            }
          </div>
        </Section>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <Section title="Gizli Form Alanları">
          <div className="mt-3">
            {data?.hidden_fields?.length ? (
              <ul className="text-sm space-y-2">
                {data.hidden_fields.map((h: any, idx: number) => (
                  <li key={idx} className="border border-white/10 rounded p-2 bg-black/20">
                    <div>name: {h.name || "-"}</div>
                    <div>id: {h.id || "-"}</div>
                    <div>value: {h.value || "-"}</div>
                  </li>
                ))}
              </ul>
            ) : <span className="text-white/70">Yok</span>}
          </div>
        </Section>

        <Section title="Cookie'ler">
          <div className="mt-3">
            {data?.cookies?.length ? (
              <ul className="text-sm space-y-2">
                {data.cookies.map((c: any, idx: number) => (
                  <li key={idx} className="border border-white/10 rounded p-2 bg-black/20">
                    <div><span className="font-semibold">{c.name}</span> = {c.value}</div>
                    <div>domain: {c.domain} path: {c.path} secure: {String(c.secure)}</div>
                    <div>httpOnly: {String(c.httpOnly)} sameSite: {c.sameSite || "-"}</div>
                  </li>
                ))}
              </ul>
            ) : <span className="text-white/70">Yok</span>}
          </div>
        </Section>
      </div>

      <div className="mt-8">
        <Section title="Özet Rapor" icon={<FileJson className="w-5 h-5" />}>
          <div className="mt-3 flex items-center gap-3">
            <button
              className="px-4 py-2 rounded bg-gatespy-400 text-black font-semibold hover:bg-gatespy-300 transition flex items-center gap-2 shadow-lg shadow-gatespy-400/30"
              onClick={downloadJson}
            >
              <Download className="w-4 h-4" /> JSON indir
            </button>
            <span className="text-white/70 text-sm">Tam raporu indirip paylaşabilirsiniz.</span>
          </div>
          <pre className="mt-4 text-xs bg-black/30 rounded p-4 overflow-auto max-h-[400px]">
            {data ? JSON.stringify(data, null, 2) : "Henüz analiz yok"}
          </pre>
        </Section>
      </div>
    </div>
  );
}