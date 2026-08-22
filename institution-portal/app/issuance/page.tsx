"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Database, Plus, CheckCircle2, AlertTriangle, XCircle, Layers, ArrowRight, Activity, Terminal } from "lucide-react";
import { api } from "@shared/api/client";
import { Student, AcademicEvent, Credential, Institution, formatCredentialType, truncateHash } from "@shared/types";

export default function InstitutionIssuancePage() {
  const [selectedInst] = useState({ id: "a1111111-1111-1111-1111-111111111111", code: "VERA-TECH", name: "VERA Institute of Technology" });
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [issuedCreds, setIssuedCreds] = useState<Credential[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Officers (seeded in DB)
  const CLERK_ID = "e1111111-1111-1111-1111-111111111111";
  const OFFICER_ID = "e2222222-2222-2222-2222-222222222222";

  // Event ingestion form
  const [studentId, setStudentId] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [semesterName, setSemesterName] = useState("Semester 2");
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCredits, setCourseCredits] = useState("4");
  const [courseGrade, setCourseGrade] = useState("A");
  const [courseMarks, setCourseMarks] = useState("");
  const [ingesting, setIngesting] = useState(false);

  // Revocation modal
  const [revokingCredId, setRevokingCredId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    loadIssuanceData();
  }, []);

  const loadIssuanceData = async () => {
    setLoading(true);
    try {
      // 1. Fetch students
      const studList = await api.getStudents();
      setStudents(studList);
      if (studList.length > 0) {
        setStudentId(studList[0].id);
      }

      // 2. Fetch events
      const evList = await api.getInstitutionEvents(selectedInst.id);
      setEvents(evList);

      // 3. Fetch issued credentials
      // We list student credentials and aggregate them
      const aggregatedCreds: Credential[] = [];
      for (const s of studList) {
        try {
          const credRes = await api.getStudentCredentials(s.id);
          aggregatedCreds.push(...credRes.credentials.map(c => ({ ...c, student_name: s.name })));
        } catch (_) {}
      }
      setIssuedCreds(aggregatedCreds);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIngestEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIngesting(true);
    try {
      if (!studentId || !courseCode.trim() || !courseName.trim()) {
        alert("Select a student and complete the course details.");
        return;
      }
      await api.createSemesterRecord(studentId, {
        institution_id: selectedInst.id,
        academic_year: academicYear,
        semester_number: Number(semesterName.replace(/\D/g, "")) || 1,
        semester_name: semesterName,
        course_results: [{
          course_code: courseCode.trim(), course_name: courseName.trim(),
          credits: Number(courseCredits), grade: courseGrade,
          ...(courseMarks ? { marks: Number(courseMarks) } : {})
        }]
      });
      alert("Semester record validated and submitted for registrar approval.");

      loadIssuanceData();
    } catch (err: any) {
      alert(err.message || "Failed to log event");
    } finally {
      setIngesting(false);
    }
  };

  // E2E finalize wrapper
  const handleFinalize = async (eventId: string) => {
    try {
      await api.finalizeEvent(selectedInst.id, eventId);
      alert("Governance signed! Credential issued and added to the simulated ledger batch.");
      loadIssuanceData();
    } catch (err: any) {
      alert(err.message || "Failed to finalize event.");
    }
  };

  const handleFinalizeCohort = async () => {
    if (selectedEventIds.length === 0) return;
    try {
      const result = await api.finalizeCohort(selectedInst.id, selectedEventIds);
      alert(`${result.finalized_count} credentials issued and anchored in one simulated ledger batch.`);
      setSelectedEventIds([]);
      loadIssuanceData();
    } catch (err: any) {
      alert(err.message || "Failed to finalize cohort.");
    }
  };

  // Step-by-step proposal
  const handlePropose = async (eventId: string) => {
    try {
      await api.proposeEvent(selectedInst.id, eventId, CLERK_ID);
      alert("Clerk ECDSA proposal signature generated and recorded!");
      loadIssuanceData();
    } catch (err: any) {
      alert(err.message || "Failed to propose event.");
    }
  };

  // Step-by-step approval
  const handleApprove = async (eventId: string) => {
    try {
      await api.approveEvent(selectedInst.id, eventId, OFFICER_ID);
      alert("Exam Officer ECDSA signature generated! Credential is now ACTIVE.");
      loadIssuanceData();
    } catch (err: any) {
      alert(err.message || "Failed to approve event.");
    }
  };

  // Anchoring batch
  const handleAnchorBatch = async () => {
    try {
      const resp = await api.anchorBatch(selectedInst.id);
      alert(`Batch Root 0x${truncateHash(resp.batch_root)} anchored in tx ${truncateHash(resp.tx_hash)}`);
      loadIssuanceData();
    } catch (err: any) {
      alert(err.message || "Failed to anchor batch.");
    }
  };

  // Revocation confirm
  const handleRevokeSubmit = async () => {
    if (!revokingCredId) return;
    if (!revokeReason.trim()) {
      alert("Revocation reason is required.");
      return;
    }

    setRevoking(true);
    try {
      await api.revokeOnChain(revokingCredId);
      alert("Credential marked as REVOKED in the simulated ledger registry.");
      setRevokingCredId(null);
      setRevokeReason("");
      loadIssuanceData();
    } catch (err: any) {
      alert(err.message || "Failed to revoke credential.");
    } finally {
      setRevoking(false);
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
              <Link href="/issuance" className="bg-white text-[#14213D] px-3.5 py-1.5 rounded-lg shadow-sm">Issuance & Batch</Link>
              <Link href="/verifications" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Verifier Checks</Link>
              <Link href="/audit" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Logs</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Credential Issuance Center</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Dual-authorization signatures, batch anchoring, and revocations</p>
            </div>
          </div>

          <button
            onClick={handleFinalizeCohort}
            disabled={selectedEventIds.length === 0}
            className="bg-[#0F766E] hover:bg-[#115E59] disabled:bg-slate-300 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md cursor-pointer disabled:cursor-not-allowed"
          >
            <Layers className="h-4 w-4" /> Finalize & Anchor Cohort ({selectedEventIds.length})
          </button>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-[#14213D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Loading issuance ledgers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left 4 Cols: Log Academic Data Form */}
            <div className="lg:col-span-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#14213D]" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Write Academic Record</h3>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Log official semester GPA summaries or degrees into the registrar database. The VERA trust engine checks chronology before writing.
                </p>

                <form onSubmit={handleIngestEvent} className="space-y-4 pt-2">
                  {/* Select Student */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase font-bold">Student Record</label>
                    <select
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 font-bold cursor-pointer"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.matriculation_no})</option>
                      ))}
                    </select>
                  </div>

                  {/* Structured semester record */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase font-bold">Academic Year</label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 font-bold cursor-pointer"
                    >
                      <option>2025-2026</option><option>2024-2025</option><option>2023-2024</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Semester<select value={semesterName} onChange={(e) => setSemesterName(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 font-bold"><option>Semester 1</option><option>Semester 2</option><option>Semester 3</option><option>Semester 4</option><option>Semester 5</option><option>Semester 6</option><option>Semester 7</option><option>Semester 8</option></select></label>
                    <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Credits<input type="number" min="1" max="60" value={courseCredits} onChange={(e) => setCourseCredits(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 font-bold" /></label>
                    <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Course code<input required value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="CS401" className="mt-1 w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 font-bold" /></label>
                    <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Grade<select value={courseGrade} onChange={(e) => setCourseGrade(e.target.value)} className="mt-1 w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 font-bold"><option>A+</option><option>A</option><option>B+</option><option>B</option><option>C</option><option>D</option><option>F</option></select></label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Course name<input required value={courseName} onChange={(e) => setCourseName(e.target.value)} placeholder="Distributed Systems" className="mt-1 w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 font-bold" /></label>
                    <label className="text-[10px] text-slate-400 font-mono uppercase font-bold">Marks optional<input type="number" min="0" max="100" value={courseMarks} onChange={(e) => setCourseMarks(e.target.value)} placeholder="88" className="mt-1 w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 font-bold" /></label>
                  </div>

                  <button
                    type="submit"
                    disabled={ingesting}
                    className="w-full flex items-center justify-center gap-2 bg-[#14213D] hover:bg-[#14213D]/95 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="h-4 w-4" /> {ingesting ? "Writing..." : "Write to DB"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right 8 Cols: Governance Queue & Registry */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Operations Governance Queue */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Activity className="h-4 w-4 text-[#14213D]" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Governance Approval Queue</h3>
                </div>

                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No active academic database logs found.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {events.map((ev) => (
                      <div key={ev.event_id} className="py-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 text-xs">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {ev.status !== "ISSUED" && ev.status !== "REJECTED" && (
                              <input
                                type="checkbox"
                                checked={selectedEventIds.includes(ev.event_id)}
                                onChange={() => setSelectedEventIds((current) => current.includes(ev.event_id) ? current.filter((id) => id !== ev.event_id) : [...current, ev.event_id])}
                                aria-label={`Select ${ev.student_name} event`}
                              />
                            )}
                            <span className="text-[9px] font-bold font-mono uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-150">
                              {ev.event_type}
                            </span>
                            <h4 className="font-bold text-slate-900">{ev.student_name}</h4>
                            <span className="text-[9px] text-slate-400 font-mono">{ev.status}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 bg-slate-50 border border-slate-150 rounded-xl p-2.5 text-[10px] text-slate-500 leading-normal max-w-lg">
                            {Object.entries(ev.payload || {}).slice(0, 5).map(([key, value]) => <span key={key}><strong className="font-semibold text-slate-400">{formatCredentialType(key)}:</strong> {String(value)}</span>)}
                          </div>
                          {ev.status === "SUSPICIOUS_REVIEW" && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 w-fit">
                              <AlertTriangle className="h-3.5 w-3.5" /> Timeline Warning: Anomalous chronological date detected!
                            </span>
                          )}
                        </div>

                        {/* Signatures buttons */}
                        <div className="flex flex-wrap gap-2 shrink-0">
                          {ev.status === "PENDING" && (
                            <button
                              onClick={() => handlePropose(ev.event_id)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors cursor-pointer"
                            >
                              Sign Clerk
                            </button>
                          )}
                          {ev.status === "CLERK_SIGNED" && (
                            <button
                              onClick={() => handleApprove(ev.event_id)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors cursor-pointer border border-indigo-200"
                            >
                              Sign Exam Officer
                            </button>
                          )}
                          {ev.status !== "ISSUED" && ev.status !== "REJECTED" && (
                            <button
                              onClick={() => handleFinalize(ev.event_id)}
                              className="bg-[#14213D] hover:bg-[#14213D]/95 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              E2E Issue <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Registry */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Issued Credentials Registry</h3>
                </div>

                {issuedCreds.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No credentials issued into the simulated ledger yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 text-xs">
                    {issuedCreds.map((c) => (
                      <div key={c.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{c.student_name}</span>
                            <span className="text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                    {formatCredentialType(c.credential_type)}
                            </span>
                            {c.status === 'ACTIVE' ? (
                              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[9px] font-bold border border-emerald-250">ACTIVE</span>
                            ) : (
                              <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold border border-red-250 animate-pulse">REVOKED</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-mono mt-1 leading-normal">
                                    Root: {truncateHash(c.merkle_root, 24)} <br className="md:hidden" />
                            Tx: {c.onchain_tx_hash ? truncateHash(c.onchain_tx_hash, 18) : "Pending local anchoring"}
                          </p>
                        </div>

                        {c.status === "ACTIVE" && (
                          <button
                            onClick={() => setRevokingCredId(c.id)}
                            className="text-red-650 hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer text-center"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Revocation Modal */}
      {revokingCredId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <button
              onClick={() => setRevokingCredId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 font-mono text-sm"
            >
              Cancel
            </button>
            <h3 className="text-md font-bold text-slate-900">Revoke Verification Status</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              This action writes an invalidation status to the simulated ledger. Verifiers will instantly reject this credential on validation.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 font-mono block uppercase font-bold">Reason for Revocation (Mandatory)</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Administrative record error, transcript correction required."
                className="w-full h-24 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 font-medium resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRevokingCredId(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleRevokeSubmit}
                disabled={revoking}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-red-650/10"
              >
                {revoking ? "Revoking..." : "Confirm Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
