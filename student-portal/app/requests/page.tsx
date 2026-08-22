"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, FileText, Send, Calendar, Clock, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { api } from "@shared/api/client";
import { Student, DocumentRequest, Institution, formatCredentialType, truncateHash } from "@shared/types";

export default function DocumentRequestsPage() {
  const DEMO_STUDENTS = [
    { id: "b1111111-1111-1111-1111-111111111111", name: "Alice Smith (Happy Path)" },
    { id: "b5555555-5555-5555-5555-555555555555", name: "Emily White (Timeline Review)" }
  ];

  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedInstId, setSelectedInstId] = useState("");
  const [requestType, setRequestType] = useState("TRANSCRIPT");
  const [purpose, setPurpose] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRequestsData();
  }, [studentId]);

  const loadRequestsData = async () => {
    setLoading(true);
    try {
      const credData = await api.getStudentCredentials(studentId);
      setStudentInfo(credData.student);

      const reqData = await api.getStudentDocumentRequests(studentId);
      setRequests(reqData);

      const insts = await api.getInstitutions();
      setInstitutions(insts);
      if (insts.length > 0) {
        setSelectedInstId(insts[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose.trim()) {
      alert("Please state the purpose for this document request.");
      return;
    }

    setSubmitting(true);
    try {
      await api.createDocumentRequest(studentId, {
        institution_id: selectedInstId,
        request_type: requestType,
        purpose: purpose,
        details: details || undefined
      });
      alert("Document request successfully submitted to the educational registrar!");
      setPurpose("");
      setDetails("");
      // Reload list
      const reqData = await api.getStudentDocumentRequests(studentId);
      setRequests(reqData);
    } catch (err: any) {
      alert(err.message || "Failed to submit request.");
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
              <Link href="/requests" className="bg-white text-slate-800 px-3 py-1.5 rounded-lg shadow-sm">Requests</Link>
              <Link href="/share" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Share / QR</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Document Requests</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Track and request official certificates</p>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Loading document request panel...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left side request creation form */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">New Document Request</h3>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  Request academic credentials directly from registrar databases. Approved documents are issued through institutional governance and added to your wallet portfolio.
                </p>

                <form onSubmit={handleRequestSubmit} className="space-y-4 pt-2">
                  {/* Select Issuer Institution */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase font-bold">Educational Institution</label>
                    <select
                      value={selectedInstId}
                      onChange={(e) => setSelectedInstId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Request Document Type */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase font-bold">Document Type</label>
                    <select
                      value={requestType}
                      onChange={(e) => setRequestType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
                    >
                      <option value="TRANSCRIPT">Official Transcript</option>
                      <option value="DEGREE_AWARD">Degree Certificate</option>
                      <option value="MIGRATION_REQ">Migration Certificate</option>
                      <option value="BONAFIDE_REQ">Bonafide Certificate</option>
                    </select>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase font-bold">Purpose / Destination</label>
                    <input
                      type="text"
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="e.g. Higher studies at Stanford, Job at Google"
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                    />
                  </div>

                  {/* Additional details */}
                  <div>
                    <label className="text-[10px] text-slate-400 font-mono block mb-1 uppercase font-bold">Supporting Info / Comments (Optional)</label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="e.g. Student roll code: CS-2022-001, graduated July 2026."
                      className="w-full h-24 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    <Send className="h-4 w-4" /> {submitting ? "Submitting..." : "Submit Registrar Request"}
                  </button>
                </form>
              </div>
            </div>

            {/* Right side requests list / tracker */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold px-1">Request Tracker & Timeline</h3>
              
              {requests.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center text-slate-400 shadow-sm">
                  You have not submitted any document requests. Use the creation panel to make your first request.
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((req) => (
                    <div key={req.id} className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-100 p-2.5 rounded-xl text-slate-600 font-bold">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono block">REQUEST ID: {truncateHash(req.id, 18)}</span>
                            <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                              {formatCredentialType(req.request_type)}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          {getStatusChip(req.status)}
                        </div>
                      </div>

                      {/* Timeline status details */}
                      <div className="py-5 grid md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Purpose / Destination</span>
                          <span className="text-slate-800 font-semibold mt-1 block">{req.purpose}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-mono block uppercase">Submission Date</span>
                          <span className="text-slate-850 font-medium mt-1 block">
                            {new Date(req.created_at).toLocaleString()}
                          </span>
                        </div>
                        {req.response_notes && (
                          <div className="md:col-span-2 bg-slate-50 border border-slate-200/60 p-4 rounded-xl space-y-1">
                            <span className="text-[10px] text-slate-400 font-mono block uppercase">Registrar Remarks</span>
                            <p className="text-slate-700 leading-relaxed font-semibold">{req.response_notes}</p>
                          </div>
                        )}
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase font-bold">
                        <span className={req.status !== 'REJECTED' ? "text-indigo-600" : ""}>Submitted</span>
                        <span className={(req.status === 'UNDER_REVIEW' || req.status === 'APPROVED' || req.status === 'PROCESSING' || req.status === 'ISSUED') ? "text-indigo-600" : ""}>Review</span>
                        <span className={(req.status === 'APPROVED' || req.status === 'PROCESSING' || req.status === 'ISSUED') ? "text-indigo-600" : ""}>Approved</span>
                        <span className={req.status === 'ISSUED' ? "text-emerald-600" : ""}>Issued</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
