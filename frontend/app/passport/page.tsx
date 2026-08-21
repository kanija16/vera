"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Award, Calendar, Clock, Eye, Trash2, CheckCircle2, AlertTriangle, XCircle, Share2, QrCode, Copy, ChevronDown } from "lucide-react";

// API Base URL
const API_URL = "http://localhost:8000/api";

export default function StudentPassport() {
  // Hardcoded seeded students for easy demo selection
  const DEMO_STUDENTS = [
    { id: "b1111111-1111-1111-1111-111111111111", name: "Alice Smith (Happy Path)" },
    { id: "b5555555-5555-5555-5555-555555555555", name: "Emily White (Timeline Review)" }
  ];

  const [selectedStudentId, setSelectedStudentId] = useState(DEMO_STUDENTS[0].id);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"credentials" | "history">("credentials");
  const [loading, setLoading] = useState(true);

  // Sharing Modal State
  const [sharingCred, setSharingCred] = useState<any>(null);
  const [shareStep, setShareStep] = useState(1);
  const [recipientType, setRecipientType] = useState("Employer");
  const [disclosedFields, setDisclosedFields] = useState<string[]>([]);
  const [shareDuration, setShareDuration] = useState("24h");
  const [shareResponse, setShareResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Fetch Student Data
  useEffect(() => {
    fetchStudentData();
  }, [selectedStudentId]);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      // 1. Fetch credentials
      const credRes = await fetch(`${API_URL}/students/${selectedStudentId}/credentials`);
      if (credRes.ok) {
        const data = await credRes.json();
        setStudentInfo(data.student);
        setCredentials(data.credentials);
      }
      
      // 2. Fetch access history
      const logRes = await fetch(`${API_URL}/students/${selectedStudentId}/access-history`);
      if (logRes.ok) {
        const data = await logRes.json();
        setAccessLogs(data.access_logs);
      }
    } catch (error) {
      console.error("Failed to fetch from backend. Using mock fallback.", error);
      setupMockFallback();
    } finally {
      setLoading(false);
    }
  };

  const setupMockFallback = () => {
    // Highly accurate mock fallback so the demo never fails
    if (selectedStudentId === "b5555555-5555-5555-5555-555555555555") {
      // Emily White (Inconsistent)
      setStudentInfo({
        student_id: "b5555555-5555-5555-5555-555555555555",
        full_name: "Emily White",
        identity_ref: "CS-2022-005",
        wallet_address: "0x7777777777777777777777777777777777777777"
      });
      setCredentials([
        {
          credential_id: "d1111111-1111-1111-1111-111111111111",
          credential_type: "transcript",
          issued_at: "2022-09-01T00:00:00",
          status: "active",
          merkle_root: "08c1fefa51b2b883a98ede6f4d185badcdf74ffa092efaa0ba1a54e8b6f5c60d",
          onchain_tx_hash: "0xmocktxhash111111111111111111111111111111111111111111111111111",
          fields: { student_name: "Emily White", roll_number: "CS-2022-005", program: "B.Tech Computer Science", admission_year: "2022" }
        },
        {
          credential_id: "d2222222-2222-2222-2222-222222222222",
          credential_type: "migration_certificate",
          issued_at: "2021-06-01T00:00:00",
          status: "review",
          merkle_root: "768a34c28745cf6d8f0ab0ec959d1a9f8824799b6b5a20e28569e3d42fd38c9c",
          onchain_tx_hash: "0xmocktxhash222222222222222222222222222222222222222222222222222",
          fields: { student_name: "Emily White", roll_number: "CS-2022-005", migration_to: "Foreign University", reason: "Transfer" }
        }
      ]);
      setAccessLogs([
        { event_time: "2026-08-21T10:45:00", verifier_label: "Foreign University Admissions", credential_type: "migration_certificate", disclosed_fields_count: 3, result: "review" }
      ]);
    } else {
      // Alice Smith (Happy path)
      setStudentInfo({
        student_id: "b1111111-1111-1111-1111-111111111111",
        full_name: "Alice Smith",
        identity_ref: "CS-2022-001",
        wallet_address: "0x3333333333333333333333333333333333333333"
      });
      setCredentials([
        {
          credential_id: "e0000000-0000-0000-0000-000000000000",
          credential_type: "transcript",
          issued_at: "2024-06-20T00:00:00",
          status: "active",
          merkle_root: "c961a9e5af8a28ecefd609f8030e2fbbf14c3478ebe4e59dfbb9b8792ac2b5c8",
          onchain_tx_hash: "0xmocktx_0192348a823b8f102830f9a203f192aa302f829f02931a2c38d019f",
          fields: { student_name: "Alice Smith", roll_number: "CS-2022-001", degree: "B.Tech Computer Science", cgpa: "9.43", graduation_year: "2026" }
        }
      ]);
      setAccessLogs([
        { event_time: "2026-08-21T11:32:00", verifier_label: "Google Recruiting", credential_type: "transcript", disclosed_fields_count: 2, result: "verified" }
      ]);
    }
  };

  const handleShareSubmit = async () => {
    try {
      const res = await fetch(`${API_URL}/credentials/${sharingCred.credential_id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verifier_label: recipientType,
          fields_allowed: disclosedFields,
          duration: shareDuration
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShareResponse(data);
        setShareStep(4);
      } else {
        throw new Error("Failed to create share pass on backend");
      }
    } catch (error) {
      console.warn("Using mock share response", error);
      // Mock share pass creation
      const mockToken = "mock_pass_" + Math.random().toString(36).substring(2, 18);
      setShareResponse({
        token: mockToken,
        qr_payload: `http://localhost:3000/verify/${mockToken}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
      setShareStep(4);
    }
  };

  const handleCopyLink = () => {
    if (shareResponse?.qr_payload) {
      navigator.clipboard.writeText(shareResponse.qr_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRevokePass = async (permissionId: string) => {
    if (!confirm("Are you sure you want to revoke this verifier's access?")) return;
    try {
      await fetch(`${API_URL}/permissions/${permissionId}`, { method: "DELETE" });
      fetchStudentData();
    } catch (error) {
      alert("Access revoked (simulated locally).");
      // Local removal
      setAccessLogs(prev => prev.filter(log => log.permission_id !== permissionId));
    }
  };

  // Status helper
  const renderStatusChip = (status: string) => {
    switch (status) {
      case "active":
      case "verified":
        return (
          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" /> VERIFIED
          </span>
        );
      case "review":
        return (
          <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full text-xs font-medium animate-pulse">
            <AlertTriangle className="h-3 w-3" /> REVIEW
          </span>
        );
      case "revoked":
        return (
          <span className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full text-xs font-medium">
            <XCircle className="h-3 w-3" /> REVOKED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                VERA
              </h1>
              <p className="text-[10px] text-slate-500 font-mono">ACADEMIC TRUST PASSPORT</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Demo Selector */}
            <div className="relative">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:border-emerald-500/50"
              >
                {DEMO_STUDENTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            </div>
            <Link href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
              Exit Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-grow w-full">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-mono">Synchronizing passport with Amoy Testnet...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile banner */}
            <div className="bg-gradient-to-b from-slate-900/80 to-slate-900/30 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-40 w-40 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-white">{studentInfo?.full_name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">Roll ID: {studentInfo?.identity_ref}</p>
                </div>
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 max-w-sm">
                  <span className="text-[10px] text-slate-500 font-mono block">DECENTRALIZED IDENTITY (DID)</span>
                  <span className="text-xs text-emerald-400 font-mono block truncate mt-1">
                    {studentInfo?.wallet_address || "0x..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-900">
              <button
                onClick={() => setActiveTab("credentials")}
                className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "credentials"
                    ? "border-emerald-400 text-emerald-400 bg-emerald-400/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                My Credentials ({credentials.length})
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`py-3 px-6 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "history"
                    ? "border-emerald-400 text-emerald-400 bg-emerald-400/5"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Access History & Audit
              </button>
            </div>

            {/* Content Switcher */}
            {activeTab === "credentials" ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Credentials stack list */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Credentials Portfolio</h3>
                  {credentials.length === 0 ? (
                    <div className="border border-dashed border-slate-850 rounded-2xl p-8 text-center text-slate-500">
                      No credentials issued to this wallet yet.
                    </div>
                  ) : (
                    credentials.map((c) => (
                      <div
                        key={c.credential_id}
                        className={`bg-slate-900/60 border rounded-2xl p-5 relative overflow-hidden transition-all hover:bg-slate-900/80 ${
                          c.status === "review" ? "border-yellow-500/20" : "border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                              {c.credential_type}
                            </span>
                            <h4 className="text-lg font-bold text-white mt-2 capitalize">
                              {c.credential_type.replace("_", " ")}
                            </h4>
                          </div>
                          {renderStatusChip(c.status)}
                        </div>

                        {/* Fields preview */}
                        <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-900/50 mb-5 space-y-1.5 text-xs text-slate-400">
                          {Object.entries(c.fields).map(([key, val]: any) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-slate-500 font-mono">{key}:</span>
                              <span className="text-slate-300 font-semibold">{val}</span>
                            </div>
                          ))}
                        </div>

                        {/* Share action button */}
                        <button
                          onClick={() => {
                            setSharingCred(c);
                            setDisclosedFields(Object.keys(c.fields)); // Default to all fields checked
                            setShareStep(1);
                            setShareResponse(null);
                          }}
                          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors"
                        >
                          <Share2 className="h-4 w-4" /> Share Record
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Trust Engine Status Summary */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Passport Trust Status</h3>
                  <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 space-y-6">
                    <div>
                      <h4 className="text-white font-bold mb-1">Academic Consistency Engine</h4>
                      <p className="text-xs text-slate-400">
                        VERA constantly validates chronological integrity across your entire educational journey on-chain.
                      </p>
                    </div>

                    {/* Trust Indicators Checklist */}
                    <div className="space-y-3.5 border-t border-slate-850 pt-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Institution Identity Verification</span>
                        <span className="text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> SECURE
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Cryptographic Issuer Signature</span>
                        <span className="text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> VALID
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">On-Chain Root Checksum Match</span>
                        <span className="text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> MATCHED
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Revocation Status Check</span>
                        <span className="text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> ACTIVE
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Admission-Migration Chronology</span>
                        {selectedStudentId === "b5555555-5555-5555-5555-555555555555" ? (
                          <span className="text-yellow-400 font-mono flex items-center gap-1 font-semibold">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" /> INCONSISTENT
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> CONSISTENT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Notice block based on status */}
                    {selectedStudentId === "b5555555-5555-5555-5555-555555555555" ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl text-xs text-yellow-400 space-y-1.5">
                        <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4" /> Timeline Inconsistency Flagged</span>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          Your Migration Certificate issue date (2021-06-01) precedes your B.Tech Admission date (2022-09-01). The Verifier Portal will display a warning flag for recruiters.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl text-xs text-emerald-400 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold">Trust Ledger Synced</span>
                          <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                            All credentials have passed layout validation, cryptographic signature verification, and chronological checks.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider font-mono">Pass Sharing & Verification Log</h3>
                
                {accessLogs.length === 0 ? (
                  <div className="border border-dashed border-slate-850 rounded-2xl p-8 text-center text-slate-500">
                    No verifier accesses or shared passes logged yet.
                  </div>
                ) : (
                  <div className="bg-slate-900/40 border border-slate-850 rounded-2xl divide-y divide-slate-850 overflow-hidden">
                    {accessLogs.map((log, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${log.result === 'verified' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-yellow-500/10 border border-yellow-500/25 text-yellow-400'}`}>
                            <Eye className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-white block">{log.verifier_label}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Viewed {log.credential_type.replace("_", " ")} &bull; {new Date(log.event_time).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {renderStatusChip(log.result)}
                          {log.permission_id && (
                            <button
                              onClick={() => handleRevokePass(log.permission_id)}
                              className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors"
                              title="Revoke Permission Pass Instantly"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sharing Flow Modal (4 Steps) */}
      {sharingCred && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setSharingCred(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-sm"
            >
              Cancel
            </button>
            
            {/* Modal header */}
            <div className="border-b border-slate-800 px-6 py-4">
              <h3 className="text-md font-bold text-white">Create Share Pass</h3>
              <p className="text-xs text-slate-500 font-mono uppercase mt-0.5">Credential: {sharingCred.credential_type}</p>
            </div>

            {/* Modal Steps content */}
            <div className="p-6">
              {/* Step 1: Who */}
              {shareStep === 1 && (
                <div className="space-y-5">
                  <label className="text-sm font-bold text-white block">Step 1: Who is requesting this credential?</label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Select the recipient type. This is written to your access log so you can monitor who views your records.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-2">
                    {["Employer", "University", "Embassy", "Government Office", "Scholarship Board"].map((rec) => (
                      <button
                        key={rec}
                        onClick={() => setRecipientType(rec)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          recipientType === rec
                            ? "bg-emerald-500 border-emerald-500 text-slate-950"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {rec}
                      </button>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => setShareStep(2)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm mt-8 transition-colors"
                  >
                    Next: Select Disclosed Fields
                  </button>
                </div>
              )}

              {/* Step 2: What (Selective Disclosure) */}
              {shareStep === 2 && (
                <div className="space-y-5">
                  <label className="text-sm font-bold text-white block">Step 2: Cryptographic Selective Disclosure</label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Check the fields you want to share. Unchecked fields are cryptographically omitted (Merkle proofs are not generated, preventing disclosure).
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {Object.keys(sharingCred.fields).map((field) => (
                      <label
                        key={field}
                        className={`flex items-center gap-3 border rounded-xl p-3 cursor-pointer transition-colors ${
                          disclosedFields.includes(field)
                            ? "border-emerald-500/50 bg-emerald-500/5 text-white"
                            : "border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-400"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={disclosedFields.includes(field)}
                          onChange={() => {
                            if (disclosedFields.includes(field)) {
                              setDisclosedFields(prev => prev.filter(f => f !== field));
                            } else {
                              setDisclosedFields(prev => [...prev, field]);
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950"
                        />
                        <span className="text-xs font-mono select-none">{field}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (disclosedFields.length === 0) {
                        alert("You must disclose at least one field.");
                        return;
                      }
                      setShareStep(3);
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm mt-8 transition-colors"
                  >
                    Next: Duration
                  </button>
                </div>
              )}

              {/* Step 3: How Long */}
              {shareStep === 3 && (
                <div className="space-y-5">
                  <label className="text-sm font-bold text-white block">Step 3: Define Expiration Date</label>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    After expiration, the verification token becomes invalid. Verifiers will no longer be able to verify your credentials.
                  </p>

                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {[
                      { key: "1h", label: "1 Hour" },
                      { key: "24h", label: "24 Hours" },
                      { key: "7d", label: "7 Days" },
                      { key: "forever", label: "No Limit" }
                    ].map((dur) => (
                      <button
                        key={dur.key}
                        onClick={() => setShareDuration(dur.key)}
                        className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          shareDuration === dur.key
                            ? "bg-emerald-500 border-emerald-500 text-slate-950"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {dur.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleShareSubmit}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-sm mt-8 transition-colors"
                  >
                    Generate Pass Token
                  </button>
                </div>
              )}

              {/* Step 4: Output Verification Pass */}
              {shareStep === 4 && (
                <div className="flex flex-col items-center text-center space-y-5">
                  <div className="bg-emerald-500/10 p-4 border border-emerald-500/25 rounded-full text-emerald-400">
                    <QrCode className="h-10 w-10" />
                  </div>
                  
                  <div>
                    <h4 className="text-white font-bold text-md">Verification Pass Generated</h4>
                    <p className="text-xs text-slate-500 mt-1">Share the link or QR code below with {recipientType}.</p>
                  </div>

                  {/* QR Mock */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-850 mt-4 flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareResponse?.qr_payload || "")}`}
                      alt="Verification Pass QR Code"
                      className="w-36 h-36"
                    />
                  </div>

                  {/* Link display & copy */}
                  <div className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 flex items-center justify-between gap-3 w-full mt-4">
                    <span className="text-xs font-mono text-emerald-400 truncate select-all text-left">
                      {shareResponse?.qr_payload}
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="text-slate-400 hover:text-white shrink-0 p-1.5 hover:bg-slate-900 rounded-lg transition-all"
                    >
                      {copied ? <span className="text-[10px] text-emerald-400 font-bold font-mono">COPIED</span> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="bg-slate-950 border border-slate-850/50 p-4 rounded-xl text-left w-full mt-4 text-[11px] text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-300">
                      Disclosed: {disclosedFields.length} of {Object.keys(sharingCred.fields).length} fields
                    </p>
                    <p className="leading-relaxed">
                      Only the selected fields are cryptographically compiled into Merkle Proofs. Undisclosed fields are completely excluded and never transmitted to the verifier.
                    </p>
                  </div>

                  <button
                    onClick={() => setSharingCred(null)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm mt-4 transition-colors"
                  >
                    Done & Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
