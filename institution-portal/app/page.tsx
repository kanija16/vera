"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Users, FileText, Database, Settings, ArrowRight, Eye, Plus, CheckCircle2, AlertTriangle, RefreshCw, Layers, ShieldAlert, Award } from "lucide-react";
import { api } from "@shared/api/client";
import { Institution, Student, DocumentRequest, AuditLog, AcademicEvent, formatCredentialType, truncateHash } from "@shared/types";

export default function InstitutionDashboard() {
  const DEMO_INSTITUTIONS = [
    { id: "a1111111-1111-1111-1111-111111111111", name: "VERA Institute of Technology", code: "VERA-TECH" }
  ];

  const [selectedInst, setSelectedInst] = useState(DEMO_INSTITUTIONS[0]);
  const [students, setStudents] = useState<Student[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [selectedInst]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch students
      const studList = await api.getStudents();
      setStudents(studList);

      // 2. Fetch requests
      const reqList = await api.getInstitutionDocumentRequests(selectedInst.id);
      setRequests(reqList);

      // 3. Fetch audit trail
      const auditRes = await api.getInstitutionAuditTrail(selectedInst.id);
      setAuditLogs(auditRes.audit_logs);

      // 4. Fetch events queue
      const evList = await api.getInstitutionEvents(selectedInst.id);
      setEvents(evList);
    } catch (err: any) {
      console.error("Institution Dashboard failed:", err);
      setError(err.message || "Failed to connect to VERA Cryptographic Core.");
    } finally {
      setLoading(false);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW").length;
  const activeStudentsCount = students.length;
  const loggedEventsCount = events.length;
  const suspiciousEventsCount = events.filter(e => e.status === "SUSPICIOUS_REVIEW").length;

  return (
    <div className="min-h-screen bg-[#F3F4F1] text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#14213D] p-2.5 rounded-xl text-white">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block leading-none">VERA Operations</span>
              <h1 className="text-xl font-bold tracking-tight text-[#14213D] mt-1">Registrar Console</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <select
                value={selectedInst.id}
                onChange={(e) => {
                  const inst = DEMO_INSTITUTIONS.find(i => i.id === e.target.value);
                  if (inst) setSelectedInst(inst);
                }}
                className="bg-slate-50 border border-slate-200 text-xs text-slate-700 font-bold rounded-xl px-4 py-2.5 pr-9 appearance-none cursor-pointer focus:outline-none"
              >
                {DEMO_INSTITUTIONS.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
              <span className="absolute right-3 top-3.5 pointer-events-none text-slate-400 text-xs">&#9662;</span>
            </div>

            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
              <Link href="/" className="bg-white text-[#14213D] px-3.5 py-1.5 rounded-lg shadow-sm">Overview</Link>
              <Link href="/students" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Students</Link>
              <Link href="/requests" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Requests</Link>
              <Link href="/issuance" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Issuance & Batch</Link>
              <Link href="/verifications" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Verifier Checks</Link>
              <Link href="/audit" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Logs</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-[#14213D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Syncing with secure cryptographic ledger...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center max-w-lg mx-auto space-y-4 shadow-sm">
            <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">VERA Core Connection Failure</h3>
            <p className="text-sm text-slate-500">{error}</p>
            <button onClick={loadDashboardData} className="px-5 py-2.5 bg-[#14213D] text-white rounded-xl text-xs font-bold hover:bg-[#14213D]/90 transition-all">
              Reconnect Console
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top metrics dashboard bar (No colorful cards, pure Stripe/Linear style) */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between divide-y md:divide-y-0 md:divide-x divide-slate-100 text-center md:text-left gap-4">
              <div className="flex-1 pb-4 md:pb-0">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Active Students Directory</span>
                <span className="text-3xl font-black text-[#14213D] mt-1 block">{activeStudentsCount} Active</span>
              </div>
              <div className="flex-1 py-4 md:py-0 md:pl-8">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Pending Document Requests</span>
                <span className="text-3xl font-black text-amber-500 mt-1 block">{pendingRequests} Awaiting</span>
              </div>
              <div className="flex-1 py-4 md:py-0 md:pl-8">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Total Logged Records</span>
                <span className="text-3xl font-black text-[#14213D] mt-1 block">{loggedEventsCount} Records</span>
              </div>
              <div className="flex-1 pt-4 md:pt-0 md:pl-8">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Timeline Anomaly Flags</span>
                <span className="text-3xl font-black text-red-500 mt-1 block">{suspiciousEventsCount} Suspicious</span>
              </div>
            </div>

            {/* Split layout: Pending actions vs audit logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left 2 Cols: Operational Workloads */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Pending Issuance Queue */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#14213D]" /> Pending Issuance Queue
                    </h3>
                    <Link href="/issuance" className="text-xs text-[#14213D] hover:underline font-bold flex items-center gap-1">
                      Manage Issuances <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {events.filter(e => e.status === "PENDING" || e.status === "CLERK_SIGNED").length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">All database entries have been finalized and issued.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {events.filter(e => e.status === "PENDING" || e.status === "CLERK_SIGNED").slice(0, 5).map((ev) => (
                        <div key={ev.event_id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold font-mono uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">
                                {formatCredentialType(ev.event_type)}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">{ev.student_name}</h4>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-md p-2 max-w-md">
                              {Object.entries(ev.payload || {}).slice(0, 3).map(([key, value]) => <span key={key}><strong className="font-semibold text-slate-400">{formatCredentialType(key)}:</strong> {String(value)}</span>)}
                            </div>
                          </div>
                          
                          <Link
                            href="/issuance"
                            className="bg-[#14213D] hover:bg-[#14213D]/95 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors shrink-0 text-center inline-flex items-center gap-1.5"
                          >
                            Finalize <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Student Requests */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#14213D]" /> Pending Document Requests
                    </h3>
                    <Link href="/requests" className="text-xs text-[#14213D] hover:underline font-bold flex items-center gap-1">
                      View All <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {requests.filter(r => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW").length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No pending student requests.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {requests.filter(r => r.status === "SUBMITTED" || r.status === "UNDER_REVIEW").slice(0, 5).map((req) => (
                        <div key={req.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {formatCredentialType(req.request_type)}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">
                                Student ID: {truncateHash(req.student_id, 8)}
                              </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 font-semibold">Purpose: {req.purpose}</p>
                          </div>
                          
                          <Link
                            href="/requests"
                            className="bg-[#14213D] hover:bg-[#14213D]/95 text-white font-bold py-1.5 px-3 rounded-lg text-[11px] transition-colors shrink-0 text-center inline-flex items-center gap-1.5"
                          >
                            Review Request <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Col: Operations Audit Logs & Sync Status */}
              <div className="lg:col-span-1 space-y-8">
                
                {/* Audit Logs Trail */}
                <div className="bg-[#14213D] text-slate-200 border border-[#14213D] rounded-3xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-2">
                      <Database className="h-4 w-4 text-indigo-400" /> Registrar Audit Trails
                    </h3>
                    <Link href="/audit" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300">
                      Fullscreen Log
                    </Link>
                  </div>

                  {auditLogs.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No logs generated yet.</p>
                  ) : (
                    <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                      {auditLogs.slice(0, 8).map((log) => (
                        <div key={log.id} className="text-xs space-y-1 border-b border-white/5 pb-2.5 last:border-b-0">
                          <div className="flex justify-between items-start gap-3">
                            <span className="font-mono text-indigo-400 font-bold">{log.action}</span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">Actor: {log.actor}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}
