"use client";

import { useState } from "react";
import { ShieldCheck, Award, FileText, Search, Settings, RefreshCw, AlertTriangle, Play, HelpCircle } from "lucide-react";
import { api } from "../shared/api/client";

export default function VERAWorkspaceGateway() {
  const [tamperingCredId, setTamperingCredId] = useState("c1111111-1111-1111-1111-111111111111");
  const [tamperField, setTamperField] = useState("gpa");
  const [tamperValue, setTamperValue] = useState("9.95");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleResetDb = async () => {
    setLoadingAction("reset");
    try {
      await api.resetDatabase();
      alert("VERA local database source-of-truth has been re-seeded and cryptographic trees rebuilt!");
    } catch (err: any) {
      alert(err.message || "Failed to reset database.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTamper = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction("tamper");
    try {
      await api.tamperRecord({
        credential_id: tamperingCredId,
        field_name: tamperField,
        field_to_tamper: tamperField, // compatibility
        new_value: tamperValue
      });
      alert(`Simulated Database Injection! Off-chain GPA is now altered in database. Try verifying to watch validation checks fail.`);
    } catch (err: any) {
      alert(err.message || "Failed to simulate tampering.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent font-sans">
                VERA
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">Decentralized Academic Trust Layer</p>
            </div>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold">
            Simulated Contract Registry Live
          </span>
        </div>
      </header>

      {/* Main Workspace Selector */}
      <main className="max-w-6xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center gap-12 w-full">
        
        {/* Banner Explainer */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-white">
            Academic credentials. <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Instant cryptographic proof.
            </span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            VERA is a production-grade academic verification architecture split into three isolated workspaces. Explore the student wallet passport, the university governance issuer console, and the decoupled recruiter verifier.
          </p>
        </div>

        {/* Port Gateway Selection Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* Student Portal (Port 3000) */}
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-slate-900/40 border border-slate-900 rounded-3xl p-6 transition-all duration-300 hover:border-emerald-500/40 hover:bg-slate-900/60 hover:-translate-y-1 overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 transition-all duration-500 group-hover:bg-emerald-500/10" />
            <div>
              <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 w-fit mb-6 text-emerald-400">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                Student Passport Wallet
              </h3>
              <p className="text-xs text-slate-450 mb-6 leading-relaxed">
                Wallet interface. Generate time-bound QR passes with cryptographic selective disclosure, answer challenges, view access logs, and revoke access keys immediately.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400 uppercase pt-2">
              <span>Port 3000</span>
              <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Launch Workspace &rarr;
              </span>
            </div>
          </a>

          {/* Institution Portal (Port 3001) */}
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-slate-900/40 border border-slate-900 rounded-3xl p-6 transition-all duration-300 hover:border-blue-500/40 hover:bg-slate-900/60 hover:-translate-y-1 overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 transition-all duration-500 group-hover:bg-blue-500/10" />
            <div>
              <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 w-fit mb-6 text-blue-400">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                Registrar Governance Console
              </h3>
              <p className="text-xs text-slate-450 mb-6 leading-relaxed">
                University command center. Clerk & Exam Officer dual-approval workflow. Finalize academic database events and anchor commitments on smart contracts.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-400 uppercase pt-2">
              <span>Port 3001</span>
              <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Launch Workspace &rarr;
              </span>
            </div>
          </a>

          {/* Verifier Portal (Port 3002) */}
          <a
            href="http://localhost:3002"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative bg-slate-900/40 border border-slate-900 rounded-3xl p-6 transition-all duration-300 hover:border-purple-500/40 hover:bg-slate-900/60 hover:-translate-y-1 overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 transition-all duration-500 group-hover:bg-purple-500/10" />
            <div>
              <div className="bg-purple-500/10 p-3 rounded-xl border border-purple-500/20 w-fit mb-6 text-purple-400">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                Decoupled Verifier Portal
              </h3>
              <p className="text-xs text-slate-450 mb-6 leading-relaxed">
                Recruiter scanning page. Checks 6 progressive verification layers, runs timeline chronology integrity checks, and flags plagiarism anomalies to the issuing university.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs font-mono font-bold text-purple-400 uppercase pt-2">
              <span>Port 3002</span>
              <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Launch Workspace &rarr;
              </span>
            </div>
          </a>

        </div>

        {/* Demo Center & Sandbox Control Panel */}
        <div className="bg-slate-900/25 border border-slate-900 rounded-3xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-md font-bold text-white">Security Simulation Sandbox</h3>
              <p className="text-[11px] text-slate-450 font-mono mt-0.5">Control local test inputs and trigger validation breaches</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* Database Reset Action */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-400">
              <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">1. Re-Seed & Clear Database</span>
              <p>
                Reset the local SQLite engine. This wipes all manual changes and seeds standard test cases: Alice Smith (Happy Path transcript) and Emily White (timeline chronology conflict).
              </p>
              <button
                onClick={handleResetDb}
                disabled={loadingAction === "reset"}
                className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 py-2.5 px-4 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loadingAction === "reset" ? 'animate-spin' : ''}`} /> Reset & Seed VERA Database
              </button>
            </div>

            {/* Simulated Database Injection (Tamper GPAs) */}
            <div className="space-y-4">
              <span className="text-[9px] text-slate-500 font-mono block uppercase font-bold">2. Inject Database GPAs (Tamper Simulation)</span>
              
              <form onSubmit={handleTamper} className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-500 font-mono block mb-1 uppercase font-bold">Record ID</label>
                    <input
                      type="text"
                      value={tamperingCredId}
                      onChange={(e) => setTamperingCredId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-350 rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-mono block mb-1 uppercase font-bold">Target Field</label>
                    <input
                      type="text"
                      value={tamperField}
                      onChange={(e) => setTamperField(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-350 rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-500 font-mono block mb-1 uppercase font-bold">New Value</label>
                    <input
                      type="text"
                      value={tamperValue}
                      onChange={(e) => setTamperValue(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-350 rounded-xl p-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loadingAction === "tamper"}
                  className="w-full bg-red-600/10 hover:bg-red-650/20 text-red-500 border border-red-500/20 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="h-4 w-4" /> {loadingAction === "tamper" ? "Altering..." : "Inject DB Record Value"}
                </button>
              </form>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950/40 text-xs text-slate-500 font-mono">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>&copy; 2026 VERA Cryptographic System. Developed by Antigravity.</p>
          <div className="flex gap-4">
            <span>Machine A (Portal Gateway)</span>
            <span>&bull;</span>
            <span>Machine B (FastAPI Node)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
