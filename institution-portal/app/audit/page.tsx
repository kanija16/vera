"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Database, Clock } from "lucide-react";
import { api } from "@/../shared/api/client";
import { AuditLog } from "@/../shared/types";

export default function InstitutionAuditPage() {
  const [selectedInst] = useState({ id: "a1111111-1111-1111-1111-111111111111", code: "VERA-TECH", name: "VERA Institute of Technology" });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const loadAuditTrail = async () => {
    setLoading(true);
    try {
      const data = await api.getInstitutionAuditTrail(selectedInst.id);
      setAuditLogs(data.audit_logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F1] text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-[#14213D] p-2.5 rounded-xl text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block leading-none">VERA Operations</span>
              <h1 className="text-xl font-bold tracking-tight text-[#14213D] mt-1">Registrar Console</h1>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <Link href="/" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Overview</Link>
              <Link href="/students" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Students</Link>
              <Link href="/requests" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Requests</Link>
              <Link href="/issuance" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Issuance & Batch</Link>
              <Link href="/verifications" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Verifier Checks</Link>
              <Link href="/audit" className="bg-white text-[#14213D] px-3.5 py-1.5 rounded-lg shadow-sm">Logs</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-grow w-full">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Institutional Audit Logs</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Cryptographic log of all registrar interactions and status checks</p>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-[#14213D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Loading audit trail...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Database className="h-4 w-4 text-[#14213D]" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Audit History Trail</h3>
            </div>

            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-mono">
                No logs recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 font-mono text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-indigo-600">{log.action}</span>
                        <span className="text-[10px] text-slate-450 font-semibold uppercase bg-slate-50 px-2 py-0.5 rounded border border-slate-150">
                          Actor: {log.actor}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-xl">
                          Details: {JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{new Date(log.time).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
