export const metadata = {
  title: "Gatespy",
  description: "Checkout link analyzer powered by headless Selenium",
};

import "./globals.css";
import Header from "@/components/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-white">
        {/* Animated gradient blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-gradient-to-tr from-gatespy-500 via-violet-500 to-fuchsia-500 opacity-20 blur-3xl animate-float" />
          <div className="absolute -bottom-28 -right-10 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-cyan-400 via-sky-500 to-indigo-600 opacity-20 blur-3xl animate-float-delayed" />
        </div>

        <Header />

        <main className="relative z-10">
          {children}
        </main>

        <footer className="relative z-10 mt-16 border-t border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-white/70">
            <span className="font-semibold text-white">Gatespy</span> — Checkout intelligence dashboard. Built for security and payments research.
          </div>
        </footer>
      </body>
    </html>
  );
}