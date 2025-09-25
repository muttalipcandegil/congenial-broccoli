"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="relative z-10">
      <div className="mx-auto max-w-6xl px-6 py-6 flex items-center justify-between">
        <Link href="/" className="group inline-flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gatespy-400 via-sky-400 to-fuchsia-400 shadow-lg shadow-fuchsia-500/20 group-hover:scale-105 transition-transform" />
          <div>
            <div className="text-xl font-extrabold tracking-tight">Gatespy</div>
            <div className="text-xs text-white/60 -mt-1">Checkout Analyzer</div>
          </div>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="https://vercel.com"
            target="_blank"
            className="text-sm text-white/80 hover:text-white transition"
          >
            Vercel
          </Link>
          <Link
            href="https://render.com"
            target="_blank"
            className="text-sm text-white/80 hover:text-white transition"
          >
            Backend
          </Link>
          <Link
            href="https://github.com/"
            target="_blank"
            className="text-sm px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 transition"
          >
            GitHub
          </Link>
        </nav>
      </div>
    </header>
  );
}