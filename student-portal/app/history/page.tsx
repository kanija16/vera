"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Clock, Eye, CheckCircle2, AlertTriangle, XCircle, Search } from "lucide-react";
import { api } from "@/../shared/api/client";
import { Student } from "@/../shared/types";

export default function VerificationHistoryPage() {
  const DEMO_STUDENTS = [
    { id: "b1111111-1111-1111-1111-111111111111", name: "Alice Smith (Happy Path)" },
    { id: "b5555555-5555-5555-5555-555555555555", name: "Emily White (Timeline Review)" }
  ];

  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [studentId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const credData = await api.getStudentCredentials(studentId);
      setStudentInfo(credData.student);

      const historyData = await api.getStudentAccessHistory(studentId);
      setAccessLogs(historyData.access_logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (result: string) => {
    switch (result.toLowerCase()) {
      case "verified":
      case "authentic":
        return (
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <CheckCircle2 className="h-3 w-3" /> VERIFIED
          </span>
        );
      case "review":
      case "suspicious_review":
        return (
          <span className="flex items-center gap-1 bg-amber-50 text-amber-600 border border-amber-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <AlertTriangle className="h-3 w-3 animate-pulse" /> REVIEW
          </span>
        );
      case "tampered":
      case "tampering_detected":
        return (
          <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <XCircle className="h-3 w-3" /> TAMPERED
          </span>
        );
      case "revoked":
        return (
          <span className="flex items-center gap-1 bg-red-50 text-red-600 border border-red-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
            <XCircle className="h-3 w-3" /> REVOKED
          </span>
        );
      default:
        return <span className="bg-slate-50 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-bold">{result}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-600/10 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <ShieldCheck className="h-6 w-6 text-indigo-600 group-hover:text-white" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block leading-none">VERA Wallet</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">Student Portal</h1>
            </div>
          </Link>

          <div className="flex items-center gap-5">
            <div className="relative">
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-4 py-2.5 pr-9 appearance-none font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {DEMO_STUDENTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <span className="absolute right-3 top-3.5 pointer-events-none text-slate-400 text-xs">&#9662;</span>
            </div>

            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <Link href="/" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Dashboard</Link>
              <Link href="/credentials" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Portfolio</Link>
              <Link href="/requests" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Requests</Link>
              <Link href="/share" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Share / QR</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-grow w-full">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Verification History Logs</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Real-time verifier log tracking for: {studentInfo?.name}</p>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Loading audit ledger...</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-6">
              <Clock className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Access Trails</h3>
            </div>

            {accessLogs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No verifier accesses or shared passes logged yet in the audit trails.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {accessLogs.map((log, idx) => (
                  <div key={idx} className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="p-2.5 bg-slate-50 border border-slate-200/50 rounded-xl text-slate-500 shrink-0">
                        <Eye className="h-5 w-5" />
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-900">{log.verifier_label}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono uppercase font-bold text-[9px]">
                            {log.credential_type.replace("_", " ")}
                          </span>
                          <span>&bull;</span>
                          <span className="font-semibold text-slate-600">{log.disclosed_fields_count} fields read</span>
                          <span>&bull;</span>
                          <span className="font-mono text-slate-400">{new Date(log.event_time).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-4 text-xs font-mono">
                      {getResultBadge(log.result)}
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
