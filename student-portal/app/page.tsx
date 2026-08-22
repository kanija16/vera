"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Award, FileText, Share2, Bell, User, Clock, CheckCircle2, AlertTriangle, XCircle, ArrowRight, Plus, Eye, ChevronDown, Sparkles } from "lucide-react";
import { api } from "@shared/api/client";
import { Student, Credential, DocumentRequest, Notification, formatCredentialType, truncateHash } from "@shared/types";

export default function StudentDashboard() {
  const DEMO_STUDENTS = [
    { id: "b1111111-1111-1111-1111-111111111111", name: "Alice Smith (Happy Path)" },
    { id: "b5555555-5555-5555-5555-555555555555", name: "Emily White (Timeline Review)" }
  ];

  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [studentId]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch credentials
      const credData = await api.getStudentCredentials(studentId);
      setStudentInfo(credData.student);
      setCredentials(credData.credentials);
      try {
        const insight = await api.getStudentSummary(studentId);
        setAiSummary(insight.summary);
      } catch {
        setAiSummary(null);
      }

      // 2. Fetch requests
      const reqData = await api.getStudentDocumentRequests(studentId);
      setRequests(reqData);

      // 3. Fetch notifications
      const notifData = await api.getStudentNotifications(studentId);
      setNotifications(notifData);

      // 4. Fetch access logs
      const historyData = await api.getStudentAccessHistory(studentId);
      setAccessLogs(historyData.access_logs);
    } catch (err: any) {
      console.error("Dashboard load failed:", err);
      setError(err.message || "Failed to connect to VERA Cryptographic Service.");
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.markStudentNotificationsRead(studentId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const activeSharedCount = accessLogs.length; // Active verification passes
  const pendingRequestsCount = requests.filter(r => r.status !== "ISSUED" && r.status !== "REJECTED").length;

  return (
    <div className="vera-app min-h-screen bg-[#F7F7F5] text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-600/10">
              <ShieldCheck className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold block leading-none">VERA Wallet</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">Student Portal</h1>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Student selection drop down for easy demo transitions */}
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
              <ChevronDown className="absolute right-3 top-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>

            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
              <Link href="/" className="bg-white text-slate-800 px-3 py-1.5 rounded-lg shadow-sm">Dashboard</Link>
              <Link href="/credentials" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Portfolio</Link>
              <Link href="/requests" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Requests</Link>
              <Link href="/share" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Share / QR</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full">
        
        {loading ? (
          <div className="col-span-3 h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Decrypting wallet and syncing proofs...</p>
          </div>
        ) : error ? (
          <div className="col-span-3 bg-red-50/80 border border-red-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Database Connection Offline</h3>
            <p className="text-sm text-slate-500">{error}</p>
            <button onClick={loadDashboardData} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors">
              Retry Sync
            </button>
          </div>
        ) : (
          <>
            {/* Left Col: Passport Profile card and stats */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* VERA Passport Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-indigo-950/10">
                <div className="absolute -top-12 -right-12 h-44 w-44 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-16 -left-16 h-48 w-48 bg-emerald-500/5 rounded-full blur-3xl" />
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <span className="text-[10px] tracking-widest uppercase text-indigo-300 font-bold block mb-1">VERA SECURE CREDENTIAL PASSPORT</span>
                    <h2 className="text-3xl font-black tracking-tight">{studentInfo?.name}</h2>
                    <p className="text-sm text-slate-400 font-mono mt-1">Roll ID: {studentInfo?.matriculation_no}</p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 backdrop-blur-md max-w-sm">
                    <span className="text-[9px] text-slate-400 font-mono block">DECENTRALIZED IDENTITY (DID)</span>
                    <span className="text-xs text-emerald-400 font-mono block truncate mt-1">
                      {studentInfo?.wallet_address || "0xNotAvailable"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/10 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Portfolio</span>
                    <span className="text-xl font-bold text-white mt-1 block">{credentials.length} Records</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Verified State</span>
                    <span className="text-xl font-bold text-emerald-400 mt-1 block">100% Valid</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Pending Requests</span>
                    <span className="text-xl font-bold text-amber-400 mt-1 block">{pendingRequestsCount} Awaiting</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Active Share Links</span>
                    <span className="text-xl font-bold text-indigo-400 mt-1 block">{activeSharedCount} Passes</span>
                  </div>
                </div>
              </div>

              {/* Quick Actions Launcher */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link href="/requests" className="flex flex-col items-center justify-center p-4 bg-[#F8F9FA] hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-200 rounded-2xl text-center transition-all group">
                    <div className="bg-indigo-600/10 p-3 rounded-xl mb-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Request Document</span>
                  </Link>

                  <Link href="/share" className="flex flex-col items-center justify-center p-4 bg-[#F8F9FA] hover:bg-emerald-50 border border-slate-200/60 hover:border-emerald-200 rounded-2xl text-center transition-all group">
                    <div className="bg-emerald-600/10 p-3 rounded-xl mb-3 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Share2 className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Generate QR Pass</span>
                  </Link>

                  <Link href="/credentials" className="flex flex-col items-center justify-center p-4 bg-[#F8F9FA] hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-200 rounded-2xl text-center transition-all group">
                    <div className="bg-indigo-600/10 p-3 rounded-xl mb-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Award className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">View Portfolio</span>
                  </Link>

                  <Link href="/share" className="flex flex-col items-center justify-center p-4 bg-[#F8F9FA] hover:bg-indigo-50 border border-slate-200/60 hover:border-indigo-200 rounded-2xl text-center transition-all group">
                    <div className="bg-indigo-600/10 p-3 rounded-xl mb-3 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Eye className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">Active Shares</span>
                  </Link>
                </div>
              </div>

              {/* Recent Credentials Portfolio */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">Recent Credentials Portfolio</h3>
                  <Link href="/credentials" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1">
                    See Portfolio <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {credentials.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-slate-400">
                    No credentials logged on this wallet. Submit a request to your educational institution.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {credentials.slice(0, 4).map((c) => (
                      <div key={c.id} className="bg-white border border-slate-200/80 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {formatCredentialType(c.credential_type)}
                            </span>
                            <h4 className="text-md font-bold text-slate-900 mt-2 capitalize">
                              {formatCredentialType(c.credential_type)} Record
                            </h4>
                          </div>
                          {c.status === "ACTIVE" ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/40">
                              <CheckCircle2 className="h-3.5 w-3.5" /> VERIFIED
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200/40">
                              <XCircle className="h-3.5 w-3.5" /> REVOKED
                            </span>
                          )}
                        </div>

                        <div className="bg-[#F8F9FA] border border-slate-200/60 rounded-xl p-3.5 mt-4 space-y-1 text-xs text-slate-500">
                          {Object.entries(c.fields).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="font-mono text-slate-400">{k}:</span>
                              <span className="font-semibold text-slate-700">{v}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100">
                          <span className="text-[10px] font-mono text-slate-400">
                            Tx: {truncateHash(c.onchain_tx_hash, 10)}
                          </span>
                          <Link href="/credentials" className="text-xs text-indigo-600 hover:text-indigo-700 font-bold">
                            View Proof &rarr;
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Col: Notifications alerts and Access history */}
            <div className="space-y-8">
              <div className="border border-teal-100 bg-teal-50 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-teal-800"><Sparkles className="h-4 w-4" /><h3 className="text-xs font-bold uppercase tracking-widest">Academic insight</h3></div>
                <p className="text-sm leading-relaxed text-teal-950">{aiSummary || "Preparing an insight from your verified records..."}</p>
                <p className="text-[10px] font-semibold text-teal-700">AI-generated summary grounded in verified credential records. Not an official decision.</p>
              </div>
              
              {/* Notifications Alert Feed */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                    <Bell className="h-4 w-4" /> Live Notifications
                  </h3>
                  {notifications.some(n => !n.is_read) && (
                    <button onClick={markAllRead} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">
                      Mark Read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No recent notifications.</p>
                ) : (
                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div key={n.id} className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${n.is_read ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-indigo-50/20 border-indigo-100 text-slate-800 font-semibold'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <span className="font-bold">{n.title}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-normal">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-normal">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dynamic Verification Access Logs */}
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> verification history logs
                </h3>

                {accessLogs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No accesses recorded yet.</p>
                ) : (
                  <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                    {accessLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-3 text-xs">
                        <div className={`p-2 rounded-xl shrink-0 h-fit ${log.result === 'verified' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50/80 text-red-500'}`}>
                          <Eye className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 block leading-tight">{log.verifier_label}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight">
                            Viewed {formatCredentialType(log.credential_type).toLowerCase()} record
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            {new Date(log.event_time).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </>
        )}
      </main>
    </div>
  );
}
