"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Play, RotateCcw, AlertTriangle, Eye } from "lucide-react";

const API_URL = "http://localhost:8000/api";

export default function DemoSandbox() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSimulateTamper = async (state: "tamper" | "restore") => {
    setLoading(true);
    setMessage(null);
    try {
      // Alice's seeded transcript ID is finalized from the event in the test or we can mock/interact with the db
      // We will mutate Alice's transcript GPA
      // Let's use the credential ID from our seeded test
      // In the seed script, Emily's admission transcript is d1111111-1111-1111-1111-111111111111.
      // We can tamper with Emily's transcript GPA or Alice's transcript.
      // Let's call /verify/tamper-simulate for Emily's transcript d1111111-1111-1111-1111-111111111111
      const res = await fetch(`${API_URL}/verify/tamper-simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credential_id: "d1111111-1111-1111-1111-111111111111", // Emily White's Admission Transcript
          field_to_tamper: "program",
          new_value: state === "tamper" ? "Ph.D. Quantum Physics" : "B.Tech Computer Science" // original
        })
      });
      if (res.ok) {
        setMessage(
          state === "tamper"
            ? "DATABASE MUTATION SUCCESS: Changed Emily's program from B.Tech to Ph.D. directly in the database. Verifying Emily's record will now trigger the TAMPERED check!"
            : "DATABASE RESTORED: Reset Emily's program to B.Tech Computer Science."
        );
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      setMessage(`SIMULATION FALLBACK: Simulated database modification locally. Paste token 'mock_tamper_pass' in the Verifier to test.`);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerRevoke = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/credentials/d1111111-1111-1111-1111-111111111111/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Administrative Cancellation: Transcript issued in error" })
      });
      if (res.ok) {
        setMessage("ON-CHAIN REVOCATION TRANSACTION SUBMITTED. Emily White's admission transcript status is now set to REVOKED on-chain!");
      } else {
        throw new Error("API request failed");
      }
    } catch (error) {
      setMessage(`SIMULATION FALLBACK: Simulated revocation on-chain. Paste token 'mock_revoke_pass' in the Verifier to test.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                VERA
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">DEMO PLAYGROUND SANDBOX</p>
            </div>
          </Link>
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            Exit Sandbox
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-grow w-full space-y-8">
        <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6">
          <h2 className="text-xl font-extrabold text-white mb-2">Hackathon Pitch Sandbox Controls</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Use these controls to interact with the PostgreSQL database and simulate the exact attack and error scenarios for the judges.
          </p>
        </div>

        {/* Sandbox Actions Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Action 1: Tamper */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-4">
            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
              SCENARIO B &bull; TAMPER DETECTION
            </span>
            <h3 className="text-md font-bold text-white">Simulate Document Forgery</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mutate Emily White's transcript record directement in the database (change program from B.Tech to Ph.D. Quantum Physics). This simulates a student attempting to edit their database fields after issuance.
            </p>
            
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleSimulateTamper("tamper")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
              >
                <Play className="h-3.5 w-3.5" /> Inject Forgery
              </button>
              <button
                onClick={() => handleSimulateTamper("restore")}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-800 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore Database
              </button>
            </div>
            
            <div className="text-center pt-2">
              <Link href="/verify/mock_tamper_pass" className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Verify tampered record &rarr;
              </Link>
            </div>
          </div>

          {/* Action 2: Revocation */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-4">
            <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
              SCENARIO D &bull; CREDENTIAL REVOCATION
            </span>
            <h3 className="text-md font-bold text-white">Trigger University Revocation</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Invalidate Emily White's transcript directly on the smart contract. The on-chain status registry changes from ACTIVE to REVOKED. Verifiers will instantly block verification.
            </p>
            
            <button
              onClick={handleTriggerRevoke}
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all"
            >
              <Play className="h-3.5 w-3.5" /> Invalidate On-Chain
            </button>
            
            <div className="text-center pt-4">
              <Link href="/verify/mock_revoke_pass" className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Verify revoked record &rarr;
              </Link>
            </div>
          </div>

          {/* Action 3: Consistency */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-4 md:col-span-2">
            <span className="text-[10px] bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
              SCENARIO C &bull; CONSISTENCY CHECK
            </span>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-md font-bold text-white">Evaluate Timeline Contradictions</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  Inspect Emily White's profile. Her Migration Certificate (issued in 2021) predates her B.Tech Admission date (in 2022). The Consistency Engine automatically catches this sequence error.
                </p>
              </div>
              <Link
                href="/verify/mock_review_pass"
                className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/25 px-5 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-2"
              >
                <Eye className="h-4 w-4" /> Load Consistency Check Demo
              </Link>
            </div>
          </div>
        </div>

        {/* Status Messages Log */}
        {message && (
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex gap-3 text-xs">
            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-white uppercase tracking-wider font-mono block">Sandbox Event Log</span>
              <p className="text-slate-300 font-mono leading-relaxed mt-1">{message}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
