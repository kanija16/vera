"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Search, QrCode } from "lucide-react";

export default function VerifierLanding() {
  const [tokenInput, setTokenInput] = useState("");
  const router = useRouter();

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      router.push(`/verify/${tokenInput.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                VERA
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">VERIFIER INSTANT PORTAL</p>
            </div>
          </Link>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Exit Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-16 flex-grow flex flex-col justify-center w-full">
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="bg-purple-500/10 p-3 rounded-full border border-purple-500/25 w-fit mx-auto text-purple-400">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Verify Student Record</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter a shared verification ID token or scan a student's QR pass to run the 6-layer cryptographic integrity and consistency checks.
            </p>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 font-mono block mb-1">PASTE VERIFICATION PASS ID</label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. mock_pass_abcdef123..."
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-purple-500/50 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
            >
              Scan & Verify Record
            </button>
          </form>

          <div className="border-t border-slate-850 pt-5 flex items-center justify-center gap-2 text-slate-500 text-xs font-mono">
            <QrCode className="h-4 w-4" /> Camera Scan enabled via QR
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950 text-center text-xs text-slate-500 font-mono">
        No login, registration, or third-party verifier account required.
      </footer>
    </div>
  );
}
