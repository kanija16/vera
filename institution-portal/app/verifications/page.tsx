"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Search, Clock, FileText, Check } from "lucide-react";
import { api } from "@/../shared/api/client";
import { VerificationRequest, IntegrityRequest } from "@/../shared/types";

export default function InstitutionVerificationsPage() {
  const [selectedInst] = useState({ id: "a1111111-1111-1111-1111-111111111111", code: "VERA-TECH", name: "VERA Institute of Technology" });
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [integrityRequests, setIntegrityRequests] = useState<IntegrityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Notes Modal state
  const [activeReq, setActiveReq] = useState<{ type: 'verification' | 'integrity'; req: any } | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVerifierRequests();
  }, []);

  const loadVerifierRequests = async () => {
    setLoading(true);
    try {
      const vReqs = await api.getInstitutionVerificationRequests(selectedInst.id);
      setVerificationRequests(vReqs);

      const iReqs = await api.getInstitutionIntegrityRequests(selectedInst.id);
      setIntegrityRequests(iReqs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!activeReq) return;
    setSubmitting(true);
    try {
      if (activeReq.type === 'verification') {
        await api.updateVerificationRequestStatus(selectedInst.id, activeReq.req.id, status, responseNotes);
      } else {
        await api.updateIntegrityRequestStatus(selectedInst.id, activeReq.req.id, status, responseNotes);
      }
      alert(`Verification request updated to ${status}.`);
      setActiveReq(null);
      setResponseNotes("");
      loadVerifierRequests();
    } catch (err: any) {
      alert(err.message || "Failed to update request.");
    } finally {
      setSubmitting(false);
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
              <Link href="/verifications" className="bg-white text-[#14213D] px-3.5 py-1.5 rounded-lg shadow-sm">Verifier Checks</Link>
              <Link href="/audit" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Logs</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Verifier Manual Actions</h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Approve manual verifier checks and handle academic plagiarism cases</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-[#14213D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Syncing verifier action ledgers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Recruiter Manual Verification Confirmation Requests */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold px-1 flex items-center gap-1.5">
                <Search className="h-4 w-4 text-[#14213D]" /> Manual Verification Requests
              </h3>
              
              {verificationRequests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs shadow-sm">
                  No verifier confirmation checks queued.
                </div>
              ) : (
                <div className="space-y-4">
                  {verificationRequests.map((v) => (
                    <div key={v.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900">{v.verifier_org}</h4>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{v.verifier_email}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                          v.status === 'PENDING' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          v.status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 font-medium text-slate-600">
                        <span className="text-[9px] text-slate-400 font-mono block uppercase mb-1">Details / Query</span>
                        {v.details}
                      </div>

                      {v.response_notes && (
                        <div className="bg-emerald-50/10 border border-emerald-250/30 rounded-xl p-3 font-semibold text-slate-700">
                          <span className="text-[9px] text-emerald-600 font-mono block uppercase mb-1">Response Notes</span>
                          {v.response_notes}
                        </div>
                      )}

                      {v.status === 'PENDING' && (
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              setActiveReq({ type: 'verification', req: v });
                              setResponseNotes(v.response_notes || "");
                            }}
                            className="bg-[#14213D] text-white hover:bg-[#14213D]/95 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                          >
                            Respond
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Plagiarism / Academic Integrity Concern Reports */}
            <div className="space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold px-1 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-[#14213D]" /> Academic Plagiarism Concerns
              </h3>
              
              {integrityRequests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 text-xs shadow-sm">
                  No plagiarism review requests submitted.
                </div>
              ) : (
                <div className="space-y-4">
                  {integrityRequests.map((i) => (
                    <div key={i.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 text-xs">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900">{i.verifier_org}</h4>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{i.verifier_email}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full font-semibold border ${
                          i.status === 'PENDING' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                          i.status === 'NO_ISSUE_FOUND' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'
                        }`}>
                          {i.status.replace("_", " ")}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 font-medium text-slate-650 space-y-2">
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono block uppercase">Academic Work Details</span>
                          <span className="font-semibold text-slate-800">{i.academic_work_details}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 font-mono block uppercase">Concern Description</span>
                          <span className="font-semibold text-slate-800">{i.concern}</span>
                        </div>
                      </div>

                      {i.response_notes && (
                        <div className="bg-emerald-50/10 border border-emerald-250/30 rounded-xl p-3 font-semibold text-slate-700">
                          <span className="text-[9px] text-emerald-600 font-mono block uppercase mb-1">Registrar Audit Findings</span>
                          {i.response_notes}
                        </div>
                      )}

                      {i.status === 'PENDING' && (
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => {
                              setActiveReq({ type: 'integrity', req: i });
                              setResponseNotes(i.response_notes || "");
                            }}
                            className="bg-[#14213D] text-white hover:bg-[#14213D]/95 px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer"
                          >
                            Resolve Flag
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Response status Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <button
              onClick={() => setActiveReq(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 font-mono text-sm"
            >
              Cancel
            </button>
            <h3 className="text-md font-bold text-slate-900">Resolve Verifier Inquiry</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-semibold">
              Verifier: {activeReq.req.verifier_org} ({activeReq.req.verifier_email})
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 font-mono block uppercase font-bold">Investigation Comments / Remarks</label>
              <textarea
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder="e.g. Identity matching checked, transcript grades are correct. Or: Investigation completed, work plagiarized."
                className="w-full h-24 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 font-medium resize-none"
              />
            </div>

            {activeReq.type === 'verification' ? (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleUpdateStatus("REJECTED")}
                  disabled={submitting}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors border border-red-200 cursor-pointer"
                >
                  Reject Confirmation
                </button>
                <button
                  onClick={() => handleUpdateStatus("CONFIRMED")}
                  disabled={submitting}
                  className="flex-1 bg-[#14213D] hover:bg-[#14213D]/95 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                >
                  Confirm Authenticity
                </button>
              </div>
            ) : (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleUpdateStatus("INCONSISTENCY_DETECTED")}
                  disabled={submitting}
                  className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors border border-red-200 cursor-pointer"
                >
                  Flag Inconsistency
                </button>
                <button
                  onClick={() => handleUpdateStatus("NO_ISSUE_FOUND")}
                  disabled={submitting}
                  className="flex-1 bg-[#14213D] hover:bg-[#14213D]/95 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
                >
                  Approve Clean
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
