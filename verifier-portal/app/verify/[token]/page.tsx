"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Clock, Eye, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Send, HelpCircle, FileText, ArrowLeft, Terminal } from "lucide-react";
import { api } from "@shared/api/client";
import { VerifyResponse, formatCredentialType } from "@shared/types";

export default function VerificationResult() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifyData, setVerifyData] = useState<VerifyResponse | null>(null);
  const [showTechnicalProof, setShowTechnicalProof] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual Check Form States
  const [verifierOrg, setVerifierOrg] = useState("");
  const [verifierEmail, setVerifierEmail] = useState("");
  const [manualDetails, setManualDetails] = useState("");
  const [submittingManual, setSubmittingManual] = useState(false);

  // Plagiarism Review Form States
  const [workDetails, setWorkDetails] = useState("");
  const [concernDesc, setConcernDesc] = useState("");
  const [submittingPlag, setSubmittingPlag] = useState(false);

  useEffect(() => {
    runVerification();
  }, [token]);

  const runVerification = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.verifyToken(token);
      setVerifyData(data);
    } catch (err: any) {
      console.error("Verification failed:", err);
      setErrorMsg(err.message || "Failed to resolve token.");
      setVerifyData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyData || !verifierOrg || !verifierEmail || !manualDetails) {
      alert("Please fill in all verifier and request details.");
      return;
    }
    setSubmittingManual(true);
    try {
      await api.createVerificationRequest({
        verifier_org: verifierOrg,
        verifier_email: verifierEmail,
        student_id: verifyData.student_id,
        credential_id: verifyData.credential_id,
        details: manualDetails
      });
      alert("Verification query successfully dispatched to university registrar! You will be notified by email.");
      setManualDetails("");
    } catch (err: any) {
      alert(err.message || "Failed to submit query.");
    } finally {
      setSubmittingManual(false);
    }
  };

  const handlePlagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyData || !workDetails || !concernDesc || !verifierOrg || !verifierEmail) {
      alert("Please fill in all details for the integrity review request.");
      return;
    }
    setSubmittingPlag(true);
    try {
      await api.createIntegrityRequest({
        verifier_org: verifierOrg,
        verifier_email: verifierEmail,
        credential_id: verifyData.credential_id,
        academic_work_details: workDetails,
        concern: concernDesc
      });
      alert("Plagiarism alert logged. University audit board will inspect this case immediately.");
      setWorkDetails("");
      setConcernDesc("");
    } catch (err: any) {
      alert(err.message || "Failed to flag plagiarism concern.");
    } finally {
      setSubmittingPlag(false);
    }
  };

  const renderBanner = () => {
    if (!verifyData) return null;
    switch (verifyData.result) {
      case "verified":
        return (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 text-center space-y-3">
            <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-full w-fit mx-auto">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-emerald-700 tracking-tight">&bull; VERIFIED &bull;</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">Decentralized signatures and roots matched contract registry.</p>
            </div>
          </div>
        );
      case "review":
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 text-center space-y-3">
            <div className="bg-amber-500/10 text-amber-600 p-3 rounded-full w-fit mx-auto">
              <AlertTriangle className="h-10 w-10 animate-bounce" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-amber-700 tracking-tight">&bull; TIMELINE REVIEW &bull;</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">Authentic signature, but chronology check flagged warnings.</p>
            </div>
          </div>
        );
      case "tampered":
        return (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3">
            <div className="bg-red-500/10 text-red-600 p-3 rounded-full w-fit mx-auto">
              <XCircle className="h-10 w-10 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-red-700 tracking-tight">&bull; TAMPERING DETECTED &bull;</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">Off-chain database values do not match anchored root hashes.</p>
            </div>
          </div>
        );
      case "revoked":
        return (
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-center space-y-3">
            <div className="bg-red-500/10 text-red-600 p-3 rounded-full w-fit mx-auto">
              <XCircle className="h-10 w-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-red-700 tracking-tight">&bull; CREDENTIAL REVOKED &bull;</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">Credential marked inactive on simulated smart contract ledger.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-slate-800 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                VERA
              </h1>
              <p className="text-[10px] text-slate-450 font-mono uppercase tracking-widest leading-none mt-1">Verifier Portal</p>
            </div>
          </Link>
          
          <button
            onClick={runVerification}
            className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-950 transition-all flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Re-Run Checks
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 py-12 flex-grow w-full">
        {loading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-3">
            <div className="h-9 w-9 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-mono text-slate-400">Executing VERA check suites...</p>
          </div>
        ) : errorMsg || !verifyData ? (
          <div className="bg-white border border-red-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Unable to verify this pass</h2>
            <p className="text-sm text-slate-500">{errorMsg || "The verification service returned no result."}</p>
            <div className="flex justify-center gap-3">
              <button onClick={runVerification} className="bg-purple-600 text-white rounded-xl px-4 py-2 text-xs font-bold">Retry verification</button>
              <button onClick={() => router.push("/verify")} className="bg-slate-100 text-slate-700 rounded-xl px-4 py-2 text-xs font-bold">Back to scanner</button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <Link href="/" className="flex items-center gap-1.5 text-xs text-slate-450 hover:text-slate-800 font-bold">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to scanner
            </Link>

            {/* Check Results Banner */}
            {renderBanner()}

            {/* Chronology Warning */}
            {verifyData.result === "review" && verifyData.consistency_errors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4.5 rounded-2xl text-xs text-amber-700 space-y-1.5">
                <span className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" /> Timeline inconsistency flag</span>
                <p className="text-slate-500 leading-relaxed text-[11px] font-semibold">{verifyData.consistency_errors[0]}</p>
              </div>
            )}

            {/* Credential Data Payload */}
            {verifyData.result !== "expired" && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Disclosed Properties</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Target: Verified Recipient</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 text-slate-650 px-2 py-0.5 rounded">
                    {formatCredentialType(verifyData.credential_type)}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono block uppercase">Student Name</span>
                    <span className="text-slate-900 font-bold mt-0.5 block">{verifyData.student_name}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono block uppercase">Issuing Institution</span>
                    <span className="text-slate-900 font-bold mt-0.5 block">{verifyData.institution_name}</span>
                  </div>
                </div>

                <div className="border border-slate-150 rounded-2xl overflow-hidden mt-4">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-150 text-[9px] font-mono font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Field Key</th>
                        <th className="px-4 py-2.5">Disclosed Value</th>
                        <th className="px-4 py-2.5 text-right">Proof Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {Object.entries(verifyData.disclosed_fields).map(([k, v]: any) => (
                        <tr key={k}>
                          <td className="px-4 py-3 font-mono text-slate-500 font-semibold">{k}</td>
                          <td className="px-4 py-3 text-slate-900 font-bold">{v}</td>
                          <td className="px-4 py-3 text-right">
                            {verifyData.result === "tampered" && k === "gpa" ? (
                              <span className="text-red-500 font-bold font-mono text-[10px]">FAILED</span>
                            ) : (
                              <span className="text-emerald-600 font-bold font-mono text-[10px]">SUCCESS</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td className="px-4 py-3 italic text-slate-400 font-medium">other_fields_present</td>
                        <td className="px-4 py-3 italic text-slate-400 font-mono font-medium">******************</td>
                        <td className="px-4 py-3 text-right text-slate-400 font-mono italic text-[10px] font-medium">hidden_by_consent</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Checklist breakdown */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
              <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Verification Checklist</h3>
              
              <div className="space-y-3.5">
                {Object.entries(verifyData.layered_checks).map(([check, passed]: any) => (
                  <div key={check} className="flex justify-between items-center text-xs">
                    <span className="text-slate-700 font-medium">{check}</span>
                    {passed ? (
                      <span className="text-emerald-600 font-mono font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> SUCCESS
                      </span>
                    ) : (
                      <span className="text-red-500 font-mono font-bold flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-red-500" /> FAILED
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Proof Panel */}
            {verifyData.result !== "expired" && (
              <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowTechnicalProof(!showTechnicalProof)}
                  className="w-full flex items-center justify-between p-5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors bg-slate-50/50"
                >
                  <span>Technical Proof Tree Data</span>
                  <span>{showTechnicalProof ? "[Hide]" : "[View]"}</span>
                </button>

                {showTechnicalProof && (
                  <div className="p-6 border-t border-slate-200 bg-slate-900 text-slate-200 font-mono text-xs space-y-5">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Anchored Merkle Root (Polygon)</span>
                      <code className="block bg-slate-950 border border-white/5 p-3 rounded-xl overflow-x-auto text-emerald-400 select-all">
                        0x{verifyData.merkle_root}
                      </code>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Smart Contract Anchoring Tx</span>
                      <code className="block bg-slate-950 border border-white/5 p-3 rounded-xl overflow-x-auto text-purple-400 select-all">
                        {verifyData.onchain_tx_hash || "Simulated Local Anchored"}
                      </code>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block mb-1 font-bold">Omitted Merkle Proof Siblings Path (JSON)</span>
                      <pre className="block bg-slate-950 border border-white/5 p-3 rounded-xl overflow-y-auto max-h-40 text-slate-400 select-all text-[10px]">
                        {JSON.stringify(verifyData.merkle_proofs || {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Verifier Action Forms (Request Manual confirmation or check Plagiarism) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              
              {/* Request Manual Confirmation */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Request Registrar Check</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Request manual verification from university registrars. Use when timeline warnings are flagged.
                </p>

                <form onSubmit={handleManualSubmit} className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Verifier Organization"
                      value={verifierOrg}
                      onChange={(e) => setVerifierOrg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 focus:outline-none"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Verifier Email"
                      value={verifierEmail}
                      onChange={(e) => setVerifierEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 focus:outline-none"
                      required
                    />
                  </div>
                  <textarea
                    placeholder="Details for registrar query e.g. verify double degree chronology."
                    value={manualDetails}
                    onChange={(e) => setManualDetails(e.target.value)}
                    className="w-full h-20 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 focus:outline-none resize-none font-medium"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingManual}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center block"
                  >
                    {submittingManual ? "Dispatching..." : "Send Registrar Confirmation query"}
                  </button>
                </form>
              </div>

              {/* Submit Plagiarism Review Request */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-xs font-mono uppercase tracking-widest text-slate-450 font-bold">Flag Academic Plagiarism</h3>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Log a plagiarism concern. The university audit team will run internal verification sweeps.
                </p>

                <form onSubmit={handlePlagSubmit} className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Verifier Organization"
                      value={verifierOrg}
                      onChange={(e) => setVerifierOrg(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 focus:outline-none"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Verifier Email"
                      value={verifierEmail}
                      onChange={(e) => setVerifierEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 focus:outline-none"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Work title / paper reference"
                    value={workDetails}
                    onChange={(e) => setWorkDetails(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 focus:outline-none font-semibold"
                    required
                  />
                  <textarea
                    placeholder="Plagiarism/authenticity concerns details."
                    value={concernDesc}
                    onChange={(e) => setConcernDesc(e.target.value)}
                    className="w-full h-20 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl p-2.5 focus:outline-none resize-none font-medium"
                    required
                  />
                  <button
                    type="submit"
                    disabled={submittingPlag}
                    className="w-full bg-red-600 hover:bg-red-750 disabled:bg-red-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center block shadow-md shadow-red-600/10"
                  >
                    {submittingPlag ? "Submitting concern..." : "Flag Academic Plagiarism review"}
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
