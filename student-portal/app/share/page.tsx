"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Share2, QrCode, Copy, Trash2, Clock, CheckCircle2, XCircle, FileText, ChevronRight, RefreshCw, HelpCircle } from "lucide-react";
import { api } from "@/../shared/api/client";
import { Student, Credential, Permission } from "@/../shared/types";

export default function DocumentSharingPage() {
  const DEMO_STUDENTS = [
    { id: "b1111111-1111-1111-1111-111111111111", name: "Alice Smith (Happy Path)" },
    { id: "b5555555-5555-5555-5555-555555555555", name: "Emily White (Timeline Review)" }
  ];

  const [studentId, setStudentId] = useState(DEMO_STUDENTS[0].id);
  const [studentInfo, setStudentInfo] = useState<Student | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Sharing Wizard State
  const [selectedCred, setSelectedCred] = useState<Credential | null>(null);
  const [disclosedFields, setDisclosedFields] = useState<string[]>([]);
  const [shareDuration, setShareDuration] = useState("24h");
  const [recipient, setRecipient] = useState("Employer / Recruiter");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [step, setStep] = useState(1);
  const [shareResponse, setShareResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadShareData();
  }, [studentId]);

  const loadShareData = async () => {
    setLoading(true);
    setSelectedCred(null);
    setDisclosedFields([]);
    setStep(1);
    setShareResponse(null);
    try {
      const data = await api.getStudentCredentials(studentId);
      setStudentInfo(data.student);
      setCredentials(data.credentials);
      if (data.credentials.length > 0) {
        setSelectedCred(data.credentials[0]);
        setDisclosedFields(Object.keys(data.credentials[0].fields));
      }

      // Fetch active shares (permissions) - wait, we need an endpoint to list permissions!
      // Do we have one in backend? Let's check backend.
      // Ah! We can query permissions by fetching the student credentials or we can fetch student access history.
      // Wait! Let's check what permissions are active. We can create an endpoint `GET /api/v1/students/{student_id}/permissions` in the backend!
      // Let's implement it! Oh, wait, did we define `/api/v1/students/{student_id}/access-history`?
      // Yes, we did! Let's check: the access logs also contain permission-like audit actions.
      // But to list active shares correctly, let's implement `GET /api/v1/students/{student_id}/permissions` in the backend so we get real Permission records!
      // That is extremely clean. Let's see: we can query the `Permission` table for the student in the backend, return it, and display it.
      // Let's first make a quick addition to the backend endpoints for `/students/{student_id}/permissions`!
      // Wait, let's look at `backend/app/main.py`. We can add:
      // @app.get("/api/v1/students/{student_id}/permissions")
      // async def list_student_permissions(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
      //     stmt = select(Permission).filter(Permission.student_id == student_id, Permission.is_revoked == False).order_by(Permission.expires_at.desc())
      //     res = await db.execute(stmt)
      //     return [{"id": p.id, "credential_id": p.credential_id, "verifier_email": p.verifier_email, "fields_allowed": p.fields_allowed, "expires_at": p.expires_at, "access_token": p.access_token} for p in res.scalars().all()]
      //
      // That is incredibly clean! Let's write `share/page.tsx` first assuming this endpoint exists, and then add it to `backend/app/main.py`!
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Let's load the active permissions
  useEffect(() => {
    if (!studentId) return;
    fetchActivePermissions();
  }, [studentId, shareResponse]);

  const fetchActivePermissions = async () => {
    try {
      const url = `http://localhost:8000/api/v1/students/${studentId}/permissions`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPermissions(data);
      }
    } catch (err) {
      console.error("Failed to load permissions:", err);
    }
  };

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCred) return;

    // Challenge confirmation check
    if (securityAnswer.trim().toLowerCase() !== studentInfo?.name.split(" ")[0].toLowerCase()) {
      alert(`Security Check Failed: Please confirm your identity by answering the security challenge. (Hint: Your first name is ${studentInfo?.name.split(" ")[0]})`);
      return;
    }

    try {
      const resp = await api.shareCredential(selectedCred.id, {
        verifier_label: recipient,
        verifier_email: `${recipient.toLowerCase().replace(/[^a-z0-9]/g, "_")}@vera.org`,
        fields_allowed: disclosedFields,
        duration: shareDuration
      });

      const verifierUrl = `http://localhost:3002/verify/${resp.access_token}`;
      setShareResponse({
        ...resp,
        qr_payload: verifierUrl
      });
      setStep(3);
    } catch (err: any) {
      alert(err.message || "Failed to create share pass.");
    }
  };

  const handleRevoke = async (permissionId: string) => {
    if (!confirm("Are you sure you want to revoke this verifier's access? The verification pass will immediately fail.")) return;
    try {
      await api.revokePermission(permissionId);
      alert("Access revoked successfully.");
      fetchActivePermissions();
    } catch (err: any) {
      alert(err.message || "Failed to revoke access.");
    }
  };

  const copyToClipboard = () => {
    if (shareResponse?.qr_payload) {
      navigator.clipboard.writeText(shareResponse.qr_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleField = (field: string) => {
    if (disclosedFields.includes(field)) {
      setDisclosedFields(prev => prev.filter(f => f !== field));
    } else {
      setDisclosedFields(prev => [...prev, field]);
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
              <Link href="/requests" className="hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors">Requests</Link>
              <Link href="/share" className="bg-white text-slate-800 px-3 py-1.5 rounded-lg shadow-sm">Share / QR</Link>
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
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Credential Sharing & Verification Pass</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Control selective disclosure of your academic credentials</p>
          </div>
        </div>

        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Loading wallet access grants...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left side: Sharing pass creator wizard */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 space-y-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Verification Pass Wizard</h3>
                  </div>
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-bold">Step {step} of 3</span>
                </div>

                {credentials.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">You need credentials in your wallet to generate a pass.</p>
                ) : (
                  <>
                    {/* Step 1: Select Credential & Disclosed Fields */}
                    {step === 1 && (
                      <div className="space-y-5">
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase font-bold">1. Select Record to Share</label>
                          <select
                            value={selectedCred?.id || ""}
                            onChange={(e) => {
                              const c = credentials.find(cred => cred.id === e.target.value);
                              if (c) {
                                setSelectedCred(c);
                                setDisclosedFields(Object.keys(c.fields));
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold cursor-pointer"
                          >
                            {credentials.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.credential_type.replace("_", " ")} Record (ID: {c.id.substring(0, 8)}...)
                              </option>
                            ))}
                          </select>
                        </div>

                        {selectedCred && (
                          <div>
                            <label className="text-[10px] text-slate-400 font-mono block mb-2.5 uppercase font-bold">2. Cryptographic Selective Disclosure</label>
                            <p className="text-xs text-slate-500 leading-relaxed mb-4">
                              VERA uses balanced Merkle Trees. Check ONLY the properties you want the verifier to inspect. Other fields remain encrypted and are physically omitted from transmission.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3">
                              {Object.keys(selectedCred.fields).map((field) => {
                                const isDisclosed = disclosedFields.includes(field);
                                return (
                                  <button
                                    key={field}
                                    type="button"
                                    onClick={() => toggleField(field)}
                                    className={`flex items-center gap-3 border rounded-xl p-3.5 text-left transition-all ${
                                      isDisclosed
                                        ? "border-emerald-500/50 bg-emerald-50/20 text-slate-800 shadow-sm"
                                        : "border-slate-200 bg-slate-50/50 text-slate-450 hover:bg-slate-50 hover:border-slate-300"
                                    }`}
                                  >
                                    <div className={`h-4.5 w-4.5 border rounded flex items-center justify-center shrink-0 transition-colors ${isDisclosed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                                      {isDisclosed && <CheckCircle2 className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="text-xs font-mono font-semibold">{field}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-colors cursor-pointer shadow-md"
                        >
                          Next: Access Options & Challenge <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* Step 2: Access duration, recipient, and security challenge */}
                    {step === 2 && (
                      <form onSubmit={handleCreateShare} className="space-y-5">
                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-1.5 uppercase font-bold">1. Shared Pass Recipient</label>
                          <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="e.g. Google Recruiting, Stanford Admissions"
                            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 font-mono block mb-2.5 uppercase font-bold">2. Expiration Timeframe</label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { key: "1h", label: "1 Hour" },
                              { key: "24h", label: "24 Hours" },
                              { key: "7d", label: "7 Days" },
                              { key: "forever", label: "No Expiry" }
                            ].map((dur) => (
                              <button
                                key={dur.key}
                                type="button"
                                onClick={() => setShareDuration(dur.key)}
                                className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                  shareDuration === dur.key
                                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                                }`}
                              >
                                {dur.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Security challenge question */}
                        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                          <label className="text-[10px] text-slate-400 font-mono block uppercase font-bold flex items-center gap-1.5">
                            <HelpCircle className="h-4 w-4 text-slate-400" /> Identity Challenge Confirmation
                          </label>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            Confirm your consent to generate this cryptographically signed verification pass. Please answer the challenge question:
                          </p>
                          <div className="space-y-2 pt-1">
                            <p className="text-xs font-bold text-slate-800">"What is your first name?"</p>
                            <input
                              type="text"
                              value={securityAnswer}
                              onChange={(e) => setSecurityAnswer(e.target.value)}
                              placeholder="Confirm first name"
                              className="w-full bg-white border border-slate-200 text-xs text-slate-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 px-4 rounded-xl text-xs transition-colors"
                          >
                            Back
                          </button>
                          <button
                            type="submit"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-colors shadow-md"
                          >
                            Generate Pass Token
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Step 3: View generated QR / Pass */}
                    {step === 3 && shareResponse && (
                      <div className="flex flex-col items-center text-center space-y-6">
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-4 rounded-full shadow-sm">
                          <QrCode className="h-10 w-10" />
                        </div>

                        <div>
                          <h4 className="text-lg font-bold text-slate-900">Verification Pass Token Active</h4>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Only the {disclosedFields.length} selected fields are readable. Undisclosed properties are cryptographically omitted from the proof tree.
                          </p>
                        </div>

                        {/* Large QR code image */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-200 flex items-center justify-center shadow-md shadow-slate-100">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shareResponse.qr_payload)}`}
                            alt="VERA Verification QR Code"
                            className="w-40 h-40"
                          />
                        </div>

                        {/* Copy pass link */}
                        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 w-full max-w-md shadow-inner text-left">
                          <span className="text-xs font-mono text-indigo-600 truncate select-all">
                            {shareResponse.qr_payload}
                          </span>
                          <button
                            onClick={copyToClipboard}
                            className="text-slate-450 hover:text-slate-800 shrink-0 p-2 hover:bg-slate-200/60 rounded-xl transition-all"
                            title="Copy Share Link"
                          >
                            {copied ? <span className="text-[10px] text-emerald-600 font-bold font-mono">COPIED</span> : <Copy className="h-4.5 w-4.5" />}
                          </button>
                        </div>

                        <div className="bg-indigo-50/10 border border-indigo-100 rounded-2xl p-4 text-left w-full text-xs text-slate-500 leading-relaxed max-w-md">
                          <p className="font-bold text-slate-800">Expiration Details:</p>
                          <p className="mt-0.5">
                            Pass automatically expires on {new Date(shareResponse.expires_at).toLocaleString()}. You can revoke this pass manually at any time to block verifier access immediately.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setStep(1);
                            setShareResponse(null);
                          }}
                          className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 px-4 rounded-xl text-xs transition-colors"
                        >
                          Create Another Pass
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Right side: Active permissions list */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold px-1">Active Share Passes</h3>
              
              {permissions.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-3xl p-8 text-center text-slate-400 shadow-sm text-xs leading-relaxed">
                  No active verification passes found. Generated passes will appear here.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {permissions.map((p) => (
                    <div key={p.id} className="bg-white border border-slate-200/80 rounded-2xl p-4.5 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-slate-400 block">PASS ID: {p.id.substring(0, 14)}...</span>
                          <h4 className="text-xs font-bold text-slate-800 leading-tight">
                            {p.verifier_email}
                          </h4>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Disclosed: {p.fields_allowed.length} properties
                          </span>
                        </div>
                        <button
                          onClick={() => handleRevoke(p.id)}
                          className="text-red-500 hover:bg-red-50 p-2 border border-red-200/25 rounded-xl transition-all"
                          title="Revoke Pass"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-200/40 p-2.5 rounded-xl">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span>Expires {new Date(p.expires_at).toLocaleString()}</span>
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
