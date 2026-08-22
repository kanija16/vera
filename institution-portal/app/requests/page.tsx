"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, FileText, Send, CheckCircle2, XCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { api } from "@/../shared/api/client";
import { DocumentRequest } from "@/../shared/types";

export default function InstitutionRequestsPage() {
  const [selectedInst] = useState({ id: "a1111111-1111-1111-1111-111111111111", code: "VERA-TECH" });
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Status update modal states
  const [activeReq, setActiveReq] = useState<DocumentRequest | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getInstitutionDocumentRequests(selectedInst.id);
      setRequests(data);
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
      await api.updateDocumentRequestStatus(selectedInst.id, activeReq.id, status, responseNotes);
      alert(`Request status updated to ${status}.`);
      setActiveReq(null);
      setResponseNotes("");
      loadRequests();
    } catch (err: any) {
      alert(err.message || "Failed to update request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusChip = (status: string) => {
    switch (status) {
      case "SUBMITTED":
        return <span className="bg-blue-50 text-blue-600 border border-blue-200/50 px-2.5 py-1 rounded-full font-semibold">Submitted</span>;
      case "UNDER_REVIEW":
        return <span className="bg-amber-50 text-amber-600 border border-amber-200/50 px-2.5 py-1 rounded-full font-semibold animate-pulse">Under Review</span>;
      case "APPROVED":
        return <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/50 px-2.5 py-1 rounded-full font-semibold">Approved</span>;
      case "REJECTED":
        return <span className="bg-red-50 text-red-600 border border-red-200/50 px-2.5 py-1 rounded-full font-semibold">Rejected</span>;
      case "PROCESSING":
        return <span className="bg-indigo-50 text-indigo-600 border border-indigo-200/50 px-2.5 py-1 rounded-full font-semibold">Processing</span>;
      case "ISSUED":
        return <span className="bg-emerald-100 text-emerald-700 border border-emerald-300/40 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Issued</span>;
      default:
        return <span className="bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full font-semibold">{status}</span>;
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
              <Link href="/requests" className="bg-white text-[#14213D] px-3.5 py-1.5 rounded-lg shadow-sm">Requests</Link>
              <Link href="/issuance" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Issuance & Batch</Link>
              <Link href="/verifications" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Verifier Checks</Link>
              <Link href="/audit" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Logs</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-10 flex-grow w-full">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Document Requests</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Manage and review student certificate requests</p>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-[#14213D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Syncing request queue...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 text-xs shadow-sm max-w-lg mx-auto">
            No document requests submitted yet by students.
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div key={req.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2.5 rounded-xl text-[#14213D] font-bold">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-450 font-mono block">ID: {req.id.substring(0, 18)}...</span>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                        Request {req.request_type.replace("_", " ")}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {getStatusChip(req.status)}
                  </div>
                </div>

                <div className="py-5 grid md:grid-cols-3 gap-6 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Student ID</span>
                    <span className="text-slate-800 font-mono font-semibold mt-1 block">{req.student_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Purpose</span>
                    <span className="text-slate-800 font-semibold mt-1 block">{req.purpose}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block uppercase">Submitted at</span>
                    <span className="text-slate-800 font-semibold font-mono mt-1 block">
                      {new Date(req.created_at).toLocaleString()}
                    </span>
                  </div>
                  {req.details && (
                    <div className="md:col-span-3 bg-slate-50 border border-slate-200/50 p-4.5 rounded-xl text-slate-650 leading-relaxed font-semibold">
                      <span className="text-[9px] text-slate-400 font-mono block uppercase mb-1">Supporting Details / Comments</span>
                      {req.details}
                    </div>
                  )}
                  {req.response_notes && (
                    <div className="md:col-span-3 bg-amber-50/20 border border-amber-200/40 p-4.5 rounded-xl text-slate-650 leading-relaxed font-semibold">
                      <span className="text-[9px] text-amber-600 font-mono block uppercase mb-1">Registrar Action Remarks</span>
                      {req.response_notes}
                    </div>
                  )}
                </div>

                {req.status !== "ISSUED" && req.status !== "REJECTED" && (
                  <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setActiveReq(req);
                        setResponseNotes(req.response_notes || "");
                      }}
                      className="bg-[#14213D] text-white hover:bg-[#14213D]/95 px-4.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      Update Status / Add Note
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Update Status Modal */}
      {activeReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl relative">
            <button
              onClick={() => setActiveReq(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 font-mono text-sm"
            >
              Cancel
            </button>
            <h3 className="text-md font-bold text-slate-900">Update Document Request</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Review student request for {activeReq.request_type.replace("_", " ")}. Set official operational status and leave response remarks.
            </p>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-450 font-mono block uppercase font-bold">Registrar Notes</label>
              <textarea
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder="e.g. Document generated, student records verified, transcript pending convocation."
                className="w-full h-24 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-500/20 font-medium resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                onClick={() => handleUpdateStatus("UNDER_REVIEW")}
                disabled={submitting}
                className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-amber-200"
              >
                Set Review
              </button>
              <button
                onClick={() => handleUpdateStatus("APPROVED")}
                disabled={submitting}
                className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-emerald-200"
              >
                Approve
              </button>
              <button
                onClick={() => handleUpdateStatus("REJECTED")}
                disabled={submitting}
                className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-red-200"
              >
                Reject
              </button>
            </div>
            
            <button
              onClick={() => handleUpdateStatus("ISSUED")}
              disabled={submitting}
              className="w-full bg-[#14213D] hover:bg-[#14213D]/95 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center block shadow-md shadow-[#14213D]/10"
            >
              Mark as Issued
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
