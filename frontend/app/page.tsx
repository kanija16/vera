"use client";

import Link from "next/link";
import { ShieldCheck, Award, FileText, Search, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                VERA
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">ACADEMIC TRUST INFRASTRUCTURE</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
            Polygon Amoy Testnet Live
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-16 flex-grow flex flex-col justify-center">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Your credentials. Your control. <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Instant trust.
            </span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            We don't digitize certificates. We build a decentralized, tamper-proof academic trust layer that gives students complete ownership of their academic identity.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Student */}
          <Link href="/passport" className="group relative bg-slate-900/40 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900/60 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 transition-all duration-500 group-hover:bg-emerald-500/10" />
            <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 w-fit mb-6">
              <Award className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              Student Passport
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              View your degrees, transcripts, and certificates. Create time-bound, cryptographically selective sharing passes.
            </p>
            <span className="text-xs text-emerald-400 font-medium inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Enter Wallet &rarr;
            </span>
          </Link>

          {/* Issuer */}
          <Link href="/issuer" className="group relative bg-slate-900/40 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-blue-500/40 hover:bg-slate-900/60 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 transition-all duration-500 group-hover:bg-blue-500/10" />
            <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 w-fit mb-6">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
              University Console
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Registrar console to log student academic events, finalize batch credential issuance, and manage revocations.
            </p>
            <span className="text-xs text-blue-400 font-medium inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Access Registrar Console &rarr;
            </span>
          </Link>

          {/* Verifier */}
          <Link href="/verify" className="group relative bg-slate-900/40 border border-slate-800 rounded-2xl p-6 transition-all duration-300 hover:border-purple-500/40 hover:bg-slate-900/60 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 transition-all duration-500 group-hover:bg-purple-500/10" />
            <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 w-fit mb-6">
              <Search className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
              Verifier Portal
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              Scan a student's QR code or paste a verification token to run the multi-layer cryptographic and consistency checks.
            </p>
            <span className="text-xs text-purple-400 font-medium inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Open Verification Portal &rarr;
            </span>
          </Link>
        </div>

        {/* Demo Center Callout */}
        <div className="max-w-3xl mx-auto bg-slate-900/30 border border-slate-800/80 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-yellow-500/10 p-3 rounded-xl border border-yellow-500/20 shrink-0">
              <Settings className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Demo Control Sandbox</h4>
              <p className="text-xs text-slate-400 mt-1">
                Alters database states and triggers credentials anomalies to test Tampering, Revocation, and Chronology errors on-the-fly.
              </p>
            </div>
          </div>
          <Link href="/demo" className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/25 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors">
            Open Sandbox Panel
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-mono">&copy; 2026 VERA Project Blueprint. All rights reserved.</p>
          <div className="flex gap-4 text-xs text-slate-500 font-mono">
            <span>Machine A (Antigravity Core)</span>
            <span>&bull;</span>
            <span>Machine B (DB & Chain)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
