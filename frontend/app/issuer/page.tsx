"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, FileText, Plus, Database, AlertCircle, CheckCircle, Search, Trash2, ArrowRight } from "lucide-react";

const API_URL = "http://localhost:8000/api";

export default function UniversityConsole() {
  const DEMO_INSTITUTIONS = [
    { id: "a1111111-1111-1111-1111-111111111111", name: "Amrita University (Verified)", status: "VERIFIED" },
    { id: "a2222222-2222-2222-2222-222222222222", name: "Unverified Academy (Pending)", status: "PENDING" }
  ];

  const DEMO_STUDENTS = [
    { id: "b1111111-1111-1111-1111-111111111111", name: "Alice Smith (CS-2022-001)" },
    { id: "b2222222-2222-2222-2222-222222222222", name: "Bob Jones (CS-2022-002)" },
    { id: "b5555555-5555-5555-5555-555555555555", name: "Emily White (CS-2022-005)" }
  ];

  const [selectedInst, setSelectedInst] = useState(DEMO_INSTITUTIONS[0]);
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [issuedCreds, setIssuedCreds] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newEventStudentId, setNewEventStudentId] = useState(DEMO_STUDENTS[0].id);
  const [newEventType, setNewEventType] = useState("semester_lock");
  const [eventPayloadStr, setEventPayloadStr] = useState('{\n  "semester": "Semester 4",\n  "gpa": "9.21",\n  "credits_earned": "24"\n}');
  
  // Revocation Modal states
  const [revokingCredId, setRevokingCredId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  useEffect(() => {
    fetchIssuerData();
  }, [selectedInst]);

  const fetchIssuerData = async () => {
    setLoading(true);
    try {
      // 1. Fetch credentials for all students in demo to aggregate issued registry
      const allCreds = [];
      for (const s of DEMO_STUDENTS) {
        const res = await fetch(`${API_URL}/students/${s.id}/credentials`);
        if (res.ok) {
          const data = await res.json();
          allCreds.push(...data.credentials.map((c: any) => ({ ...c, student_name: s.name })));
        }
      }
      setIssuedCreds(allCreds);

      // 2. Fetch Audit Trail
      const auditRes = await fetch(`${API_URL}/institutions/${selectedInst.id}/audit-trail`);
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data.audit_logs);
      }
      
      // Setup mock empty events queue
      setActiveEvents([
        {
          event_id: "c-mock-new-event-1",
          student_name: "Bob Jones",
          event_type: "semester_lock",
          event_date: "2026-08-21T12:00:00Z",
          payload: { semester: "Semester 5", gpa: "8.78", credits_earned: "20" }
        }
      ]);

    } catch (error) {
      console.error("Backend error. Using mockup data.", error);
      setupMockupData();
    } finally {
      setLoading(false);
    }
  };

  const setupMockupData = () => {
    setIssuedCreds([
      { credential_id: "d1111111-1111-1111-1111-111111111111", student_name: "Emily White (CS-2022-005)", credential_type: "transcript", issued_at: "2022-09-01T00:00:00", status: "active", merkle_root: "08c1fefa51b2...", onchain_tx_hash: "0xmocktxhash1111..." },
      { credential_id: "d2222222-2222-2222-2222-222222222222", student_name: "Emily White (CS-2022-005)", credential_type: "migration_certificate", issued_at: "2021-06-01T00:00:00", status: "review", merkle_root: "768a34c2...", onchain_tx_hash: "0xmocktxhash2222..." }
    ]);
    setAuditLogs([
      { time: "2026-08-21T12:00:00Z", actor: "System", action: "Database Initialized" }
    ]);
    setActiveEvents([
      { event_id: "c-mock-new-event-1", student_name: "Bob Jones", event_type: "semester_lock", event_date: "2026-08-21T12:00:00Z", payload: { semester: "Semester 5", gpa: "8.78", credits_earned: "20" } }
    ]);
  };

  const handleLogEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(eventPayloadStr);
      } catch (err) {
        alert("Payload must be a valid JSON string");
        return;
      }

      const res = await fetch(`${API_URL}/institutions/${selectedInst.id}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: newEventStudentId,
          event_type: newEventType,
          payload: parsedPayload,
          event_date: new Date().toISOString()
        })
      });

      if (res.ok) {
        alert("Academic event successfully written to database source-of-truth.");
        fetchIssuerData();
      } else {
        const err = await res.json();
        alert(`Error logging event: ${err.detail}`);
      }
    } catch (error) {
      alert("FastAPI backend not running. Mock event logged locally.");
      const student = DEMO_STUDENTS.find(s => s.id === newEventStudentId);
      const newEv = {
        event_id: "c-local-mock-" + Math.random().toString(36).substring(7),
        student_name: student?.name,
        student_id: newEventStudentId,
        event_type: newEventType,
        event_date: new Date().toISOString(),
        payload: JSON.parse(eventPayloadStr)
      };
      setActiveEvents(prev => [newEv, ...prev]);
    }
  };

  const handleFinalizeBatch = async (eventId: string) => {
    try {
      const res = await fetch(`${API_URL}/institutions/${selectedInst.id}/events/${eventId}/finalize`, {
        method: "POST"
      });
      if (res.ok) {
        alert("Batch finalized! Cryptographic Merkle Root signed and anchored on Polygon Amoy.");
        fetchIssuerData();
      } else {
        const err = await res.json();
        // In case consistency check fails (Scenario C) or unverified institution (Demo 3)
        alert(`Issuance Blocked: ${err.detail?.message || err.detail || "Error"}\nReason: ${err.detail?.errors?.join(', ') || "Unauthorized"}`);
      }
    } catch (error) {
      alert("Connection failed. Smart Contract execution simulated locally.");
      setActiveEvents(prev => prev.filter(e => e.event_id !== eventId));
      fetchIssuerData();
    }
  };

  const handleRevokeSubmit = async () => {
    if (!revokeReason.trim()) {
      alert("Revocation reason is mandatory. Cannot submit empty.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/credentials/${revokingCredId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason })
      });
      if (res.ok) {
        alert("Credential revoked on-chain successfully.");
        setRevokingCredId(null);
        setRevokeReason("");
        fetchIssuerData();
      }
    } catch (error) {
      alert("Connection failed. On-chain revocation transaction simulated.");
      setRevokingCredId(null);
      setRevokeReason("");
      fetchIssuerData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                VERA
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">CREDENTIAL ISSUANCE CONSOLE</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Institution Selector */}
            <div className="relative">
              <select
                value={selectedInst.id}
                onChange={(e) => {
                  const inst = DEMO_INSTITUTIONS.find(i => i.id === e.target.value);
                  if (inst) setSelectedInst(inst);
                }}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-blue-500/50"
              >
                {DEMO_INSTITUTIONS.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
            
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Exit Console
            </Link>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-6xl mx-auto px-4 py-12 flex-grow w-full grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Log Academic events form */}
        <div className="space-y-6 md:col-span-1">
          <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Log Academic Data</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Log student achievements, semester logs, or degree allocations into the university database. Finalizing these records triggers batch auto-issuance.
            </p>

            {selectedInst.status !== "VERIFIED" && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-xs text-red-400 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">UNVERIFIED INSTITUTION</span>
                  <p className="text-slate-500 text-[10px] mt-0.5">
                    This institution status is currently PENDING. Issuance is disabled until approval.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleLogEvent} className="space-y-4">
              {/* Student */}
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">STUDENT PROFILE</label>
                <select
                  value={newEventStudentId}
                  onChange={(e) => setNewEventStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-blue-500/50"
                >
                  {DEMO_STUDENTS.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Event Type */}
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">ACADEMIC EVENT TYPE</label>
                <select
                  value={newEventType}
                  onChange={(e) => setNewEventType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="semester_lock">Semester Grade Log (transcript)</option>
                  <option value="convocation">Graduation Convocation (degree)</option>
                  <option value="migration">Migration Allocation (migration_certificate)</option>
                </select>
              </div>

              {/* JSON payload */}
              <div>
                <label className="text-[10px] text-slate-500 font-mono block mb-1">EVENT METADATA (JSON)</label>
                <textarea
                  value={eventPayloadStr}
                  onChange={(e) => setEventPayloadStr(e.target.value)}
                  className="w-full h-32 bg-slate-950 border border-slate-800 text-xs text-emerald-400 font-mono rounded-lg p-2.5 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                <Plus className="h-4 w-4" /> Log to Database
              </button>
            </form>
          </div>
        </div>

        {/* Right Columns: Events Queue and Active Registry */}
        <div className="md:col-span-2 space-y-8">
          
          {/* Pending Auto-Issuance Queue */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Pending Issuance Queue</h3>
            
            {activeEvents.length === 0 ? (
              <div className="border border-slate-850 rounded-2xl p-6 text-center text-slate-500 text-xs">
                No un-issued database events found.
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl divide-y divide-slate-850 overflow-hidden">
                {activeEvents.map((ev) => (
                  <div key={ev.event_id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-mono uppercase">
                          {ev.event_type}
                        </span>
                        <h4 className="text-xs font-bold text-white">{ev.student_name}</h4>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {JSON.stringify(ev.payload)}
                      </div>
                    </div>

                    <button
                      onClick={() => handleFinalizeBatch(ev.event_id)}
                      className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shrink-0"
                    >
                      Finalize & Auto-Issue <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Registry */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Issued Credentials registry</h3>
            
            {issuedCreds.length === 0 ? (
              <div className="border border-slate-850 rounded-2xl p-6 text-center text-slate-500 text-xs">
                No credentials issued yet.
              </div>
            ) : (
              <div className="bg-slate-900/30 border border-slate-850 rounded-2xl divide-y divide-slate-850 overflow-hidden">
                {issuedCreds.map((c) => (
                  <div key={c.credential_id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{c.student_name}</span>
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-mono">
                          {c.credential_type}
                        </span>
                        {c.status === 'review' && (
                          <span className="bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">REVIEW</span>
                        )}
                        {c.status === 'revoked' && (
                          <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">REVOKED</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Root: {c.merkle_root.substring(0, 20)}... &bull; Tx: {c.onchain_tx_hash.substring(0, 16)}...
                      </p>
                    </div>

                    {c.status !== "revoked" && (
                      <button
                        onClick={() => setRevokingCredId(c.credential_id)}
                        className="text-red-400 hover:bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0"
                      >
                        Revoke Credential
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit trail */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Institutional Audit Logs</h3>
            <div className="bg-slate-900/30 border border-slate-850 rounded-2xl max-h-56 overflow-y-auto divide-y divide-slate-850">
              {auditLogs.map((log, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between gap-4 text-xs font-mono">
                  <span className="text-slate-400">{log.action}</span>
                  <span className="text-slate-500 text-[10px]">{new Date(log.time).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Revoke Modal */}
      {revokingCredId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setRevokingCredId(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white font-mono text-sm"
            >
              Close
            </button>
            <h3 className="text-md font-bold text-white">Revoke Credential</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action is permanent and will anchor the revocation status on-chain. Verifiers will instantly reject this credential.
            </p>

            <div className="space-y-3">
              <label className="text-[10px] text-slate-500 font-mono block">REASON FOR REVOCATION (MANDATORY)</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Fraud detected, academic data entry correction"
                className="w-full h-24 bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500/50 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRevokingCredId(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeSubmit}
                className="flex-1 bg-red-500 hover:bg-red-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper
function ChevronDownIcon() {
  return (
    <svg className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
