"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Users, Search, Database, FileText, CheckCircle2, XCircle, Clock, Eye, AlertTriangle } from "lucide-react";
import { api } from "@/../shared/api/client";
import { Student, Credential, DocumentRequest } from "@/../shared/types";

export default function StudentManagement() {
  const [selectedInst] = useState({ id: "a1111111-1111-1111-1111-111111111111", code: "VERA-TECH" });
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Inspector Side Drawer state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentCreds, setStudentCreds] = useState<Credential[]>([]);
  const [studentRequests, setStudentRequests] = useState<DocumentRequest[]>([]);
  const [studentAccessLogs, setStudentAccessLogs] = useState<any[]>([]);
  const [inspectorLoading, setInspectorLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const list = await api.getStudents();
      setStudents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Inspect student drawer
  const inspectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setInspectorLoading(true);
    try {
      // 1. Get credentials
      const credData = await api.getStudentCredentials(student.id);
      setStudentCreds(credData.credentials);

      // 2. Get document requests
      const reqData = await api.getStudentDocumentRequests(student.id);
      setStudentRequests(reqData);

      // 3. Get student access logs
      const historyData = await api.getStudentAccessHistory(student.id);
      setStudentAccessLogs(historyData.access_logs);
    } catch (err) {
      console.error(err);
    } finally {
      setInspectorLoading(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.matriculation_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <Link href="/students" className="bg-white text-[#14213D] px-3.5 py-1.5 rounded-lg shadow-sm">Students</Link>
              <Link href="/requests" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Requests</Link>
              <Link href="/issuance" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Issuance & Batch</Link>
              <Link href="/verifications" className="hover:text-slate-900 px-3.5 py-1.5 rounded-lg transition-colors">Verifier Checks</Link>
              <Link href="/audit" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Logs</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full relative">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Student Directory</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Manage student identities and inspect credential histories</p>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-[#14213D] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Loading student directory...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Student Directory Table List */}
            <div className={selectedStudent ? "lg:col-span-7 space-y-4" : "lg:col-span-12 space-y-4"}>
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-grow max-w-md">
                    <input
                      type="text"
                      placeholder="Search students by name, email, or matric ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-500/20 font-medium"
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 font-bold uppercase">
                    <Users className="h-4 w-4" /> {filteredStudents.length} Students
                  </div>
                </div>

                <div className="border border-slate-150 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-150 font-mono uppercase text-[9px] font-bold">
                      <tr>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Matric ID</th>
                        <th className="px-4 py-3">Email Address</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStudents.map((s) => {
                        const isInspected = selectedStudent?.id === s.id;
                        return (
                          <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${isInspected ? 'bg-slate-50/70 font-semibold' : ''}`}>
                            <td className="px-4 py-3.5 font-bold text-slate-900">{s.name}</td>
                            <td className="px-4 py-3.5 font-mono text-slate-500">{s.matriculation_no}</td>
                            <td className="px-4 py-3.5 text-slate-500 font-medium">{s.email}</td>
                            <td className="px-4 py-3.5 text-right">
                              <button
                                onClick={() => inspectStudent(s)}
                                className="bg-[#14213D] text-white hover:bg-[#14213D]/95 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm cursor-pointer"
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Collapsible Student Profile Inspector panel */}
            {selectedStudent && (
              <div className="lg:col-span-5">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md sticky top-28 space-y-6 relative max-h-[82vh] overflow-y-auto">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="absolute top-4 right-4 text-xs font-mono font-bold text-slate-450 hover:text-slate-800"
                  >
                    Close [X]
                  </button>

                  <div className="border-b border-slate-100 pb-5">
                    <span className="text-[9px] font-mono tracking-widest text-[#14213D] font-bold block uppercase">STUDENT PROFILE INSPECTOR</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedStudent.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Matric: {selectedStudent.matriculation_no}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedStudent.email}</p>
                  </div>

                  {inspectorLoading ? (
                    <div className="h-60 flex flex-col items-center justify-center gap-2">
                      <div className="h-6 w-6 border-2 border-[#14213D] border-t-transparent rounded-full animate-spin" />
                      <p className="text-[11px] font-mono text-slate-400">Loading profile data trail...</p>
                    </div>
                  ) : (
                    <div className="space-y-6 text-xs">
                      {/* Section: Issued Credentials */}
                      <div className="space-y-3.5">
                        <h4 className="text-[10px] font-mono text-slate-450 uppercase font-bold flex items-center gap-1.5">
                          <Database className="h-4 w-4" /> Issued Credentials ({studentCreds.length})
                        </h4>
                        {studentCreds.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] pl-1">No credentials issued.</p>
                        ) : (
                          <div className="space-y-2">
                            {studentCreds.map((c) => (
                              <div key={c.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-slate-800 capitalize">
                                    {c.credential_type.toLowerCase().replace("_", " ")}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-400 block mt-0.5 truncate max-w-[200px]">
                                    Root: {c.merkle_root.substring(0, 16)}...
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  {c.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section: Requests history */}
                      <div className="space-y-3.5">
                        <h4 className="text-[10px] font-mono text-slate-450 uppercase font-bold flex items-center gap-1.5">
                          <FileText className="h-4 w-4" /> Document Requests ({studentRequests.length})
                        </h4>
                        {studentRequests.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] pl-1">No document requests recorded.</p>
                        ) : (
                          <div className="space-y-2">
                            {studentRequests.map((r) => (
                              <div key={r.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-slate-800 capitalize">{r.request_type.toLowerCase()}</span>
                                  <span className="text-[9px] text-slate-400 block mt-0.5">{r.purpose}</span>
                                </div>
                                <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {r.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Section: Access trails */}
                      <div className="space-y-3.5">
                        <h4 className="text-[10px] font-mono text-slate-450 uppercase font-bold flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> External Verification Log Accesses
                        </h4>
                        {studentAccessLogs.length === 0 ? (
                          <p className="text-slate-400 italic text-[11px] pl-1">No verification accesses logged.</p>
                        ) : (
                          <div className="space-y-2">
                            {studentAccessLogs.map((log, idx) => (
                              <div key={idx} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-800 block leading-tight">{log.verifier_label}</span>
                                  <span className="text-[10px] text-slate-500 block">
                                    Viewed {log.credential_type.toLowerCase()} record
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-mono block">
                                    {new Date(log.event_time).toLocaleString()}
                                  </span>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                  {log.result}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}
