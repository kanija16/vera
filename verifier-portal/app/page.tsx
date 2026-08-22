"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Search, QrCode, ArrowRight, CheckCircle2, Lock, ShieldAlert } from "lucide-react";

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
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex flex-col justify-between font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/10 p-2.5 rounded-xl border border-purple-600/10">
              <ShieldCheck className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block leading-none">VERA Network</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">Verifier Portal</h1>
            </div>
          </div>
          <span className="text-xs bg-purple-50 text-purple-600 border border-purple-200/40 px-3 py-1 rounded-full font-bold">
            No Account Needed
          </span>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-grow w-full grid grid-cols-1 md:grid-cols-12 gap-12 items-center justify-center">
        
        {/* Left Col: Explainer details */}
        <div className="md:col-span-7 space-y-6">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Decentralized, instant, <br />
            <span className="text-purple-600">cryptographic validation.</span>
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            VERA bypasses standard PDF validator uploads by checking digital signatures and institutional commitments. This demo uses a simulated ledger with deployable contract semantics, so the verification story remains inspectable offline.
          </p>

          <div className="space-y-4 border-t border-slate-200/80 pt-6">
            <div className="flex gap-3 text-xs leading-relaxed text-slate-600">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">100% Selective Disclosure Privacy</span>
                <p className="text-slate-450 mt-0.5">Students control which fields are visible. Hidden properties are mathematically excluded from verification proofs.</p>
              </div>
            </div>
            <div className="flex gap-3 text-xs leading-relaxed text-slate-600">
              <Lock className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Timeline Chronology Audits</span>
                <p className="text-slate-450 mt-0.5">The trust engine correlates enrollment, degree, and migration logs to verify complete history consistency.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Token input card */}
        <div className="md:col-span-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-md shadow-slate-100">
            <div className="text-center space-y-2">
              <div className="bg-purple-600/10 p-3 rounded-full border border-purple-200/25 w-fit mx-auto text-purple-600">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-md font-bold text-slate-900">Scan Shared Pass</h3>
              <p className="text-xs text-slate-450 leading-normal">
                Paste a shared verification pass ID or link to run the 6-layer validation check.
              </p>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase font-bold">Verification Pass ID</label>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste a VERA pass token or verification URL"
                  className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center block shadow-md shadow-purple-600/10"
              >
                Scan & Verify Record
              </button>
            </form>

          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-mono bg-white">
        Academic Trust Registry with a deployable contract interface and a simulated local ledger for this demo.
      </footer>
    </div>
  );
}
