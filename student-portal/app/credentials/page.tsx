"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Award, Eye, CheckCircle2, XCircle, ArrowLeft, Terminal, Copy } from "lucide-react";
import { api } from "@shared/api/client";
import { Student, Credential, formatCredentialType, formatFieldName, truncateHash } from "@shared/types";

export default function CredentialsPortfolio() {
  const DEMO_STUDENTS = [
    { id: "b1111111-1111-1111-1111-111111111111", name: "Alice Smith (Happy Path)" },
    { id: "b5555555-5555-5555-5555-555555555555", name: "Emily White (Timeline Review)" }
  ];

  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCred, setSelectedCred] = useState<Credential | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, [studentId]);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const data = await api.getStudentCredentials(studentId);
      setStudentInfo(data.student);
      setCredentials(data.credentials);
      if (data.credentials.length > 0) {
        setSelectedCred(data.credentials[0]);
      } else {
        setSelectedCred(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
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
              <Link href="/credentials" className="bg-white text-slate-800 px-3 py-1.5 rounded-lg shadow-sm">Portfolio</Link>
              <Link href="/requests" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Requests</Link>
              <Link href="/share" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Share / QR</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-10 flex-grow w-full">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Academic Portfolio</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Wallet owner: {studentInfo?.name}</p>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Decrypting credential storage...</p>
          </div>
        ) : credentials.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
            <Award className="h-12 w-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900">Empty Wallet</h3>
            <p className="text-sm text-slate-500">
              You do not have any verifiable credentials in your digital wallet yet. You can request official certificates from the document request page.
            </p>
            <Link href="/requests" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors">
              Request Document
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side list of credentials */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold px-1">Issued Certificates</h3>
              
              <div className="space-y-3">
                {credentials.map((c) => {
                  const isSelected = selectedCred?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCred(c)}
                      className={`w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden ${
                        isSelected
                          ? "bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20"
                          : "bg-white/80 border-slate-200/80 hover:bg-white hover:border-slate-350 shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <span className="text-[9px] font-bold font-mono uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {formatCredentialType(c.credential_type)}
                        </span>
                        {c.status === "ACTIVE" ? (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" /> VERIFIED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                            <XCircle className="h-3.5 w-3.5" /> REVOKED
                          </span>
                        )}
                      </div>
                      <h4 className="text-md font-bold text-slate-900 mt-2.5 capitalize">
                        {formatCredentialType(c.credential_type)} Record
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">ID: {truncateHash(c.id, 18)}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right side credential detailing and Merkle proof inspector */}
            <div className="lg:col-span-2 space-y-6">
              {selectedCred && (
                <>
                  {/* Certificate Preview Card */}
                  <div className="bg-white border border-slate-200/80 rounded-3xl p-8 relative overflow-hidden shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
                    
                    <div className="flex justify-between items-start pb-6 border-b border-slate-100">
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-indigo-600 font-bold block uppercase">VERA VERIFIABLE RECORD</span>
                        <h3 className="text-xl font-bold text-slate-900 mt-1 capitalize">
                          Official {formatCredentialType(selectedCred.credential_type)}
                        </h3>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-xl font-mono uppercase font-bold">
                        V.{selectedCred.version}
                      </span>
                    </div>

                    {/* Rich Field Grid */}
                    <div className="grid md:grid-cols-2 gap-6 py-8">
                      {Object.entries(selectedCred.fields).map(([k, v]) => (
                        <div key={k} className="bg-slate-50 border border-slate-200/40 rounded-2xl p-4">
                          <span className="text-[10px] font-mono text-slate-400 uppercase block">{formatFieldName(k)}</span>
                          <span className="text-sm font-bold text-slate-800 mt-1 block">{v}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-50/50 border border-slate-250/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-mono text-slate-500">
                      <div>
                        <span>ISSUED ON</span>
                        <span className="font-bold text-slate-800 block mt-0.5">
                          {new Date(selectedCred.created_at).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric"
                          })}
                        </span>
                      </div>
                      <div>
                        <span>STATUS STATUS</span>
                        <span className={`font-bold block mt-0.5 ${selectedCred.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-500'}`}>
                          ● {selectedCred.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technical Cryptographic Details */}
                  <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 space-y-5 shadow-inner">
                    <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                      <Terminal className="h-4 w-4 text-indigo-400" />
                      <h4 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">View Technical Proof</h4>
                    </div>

                    {/* Merkle Root */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-mono">Merkle Tree Root (Hash)</span>
                        <button
                          onClick={() => copyToClipboard(selectedCred.merkle_root, "root")}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono font-semibold"
                        >
                          {copiedText === "root" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <code className="block bg-slate-950 border border-white/5 p-3 rounded-xl overflow-x-auto text-[11px] text-emerald-400 font-mono select-all">
                        {selectedCred.merkle_root}
                      </code>
                    </div>

                    {/* Canonical Payload Hash */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-mono">Canonical Payload Checksum (SHA-256)</span>
                        <button
                          onClick={() => copyToClipboard(selectedCred.canonical_payload_hash, "payload")}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono font-semibold"
                        >
                          {copiedText === "payload" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <code className="block bg-slate-950 border border-white/5 p-3 rounded-xl overflow-x-auto text-[11px] text-slate-400 font-mono select-all">
                        {selectedCred.canonical_payload_hash}
                      </code>
                    </div>

                    {/* Blockchain Tx Hash */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-mono">Simulated Ledger Receipt</span>
                        <button
                          onClick={() => copyToClipboard(selectedCred.onchain_tx_hash || "Not anchored yet", "tx")}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono font-semibold"
                        >
                          {copiedText === "tx" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <code className="block bg-slate-950 border border-white/5 p-3 rounded-xl overflow-x-auto text-[11px] text-purple-400 font-mono select-all">
                        {selectedCred.onchain_tx_hash || "Not batch-anchored yet"}
                      </code>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
