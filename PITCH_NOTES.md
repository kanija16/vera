# VERA: Pitch Notes & Defensive Q&A

This document contains key product theses, engineering explanations, and defensive answers for the team to use during the hackathon presentation and judges' Q&A.

---

## 1. Core Technical Answers (Defensive Q&A)

### Q1: Why blockchain over a central database?
> **Answer:** The database holds rich operational data. The blockchain provides two specific guarantees a database cannot:
> 1. **Proof of historical existence** that cannot be backdated (even if database tables are altered or compromised, roots cannot be falsified after anchoring).
> 2. **An independent status registry** that remains reachable and checkable even if the issuing university's own database, APIs, or IT infrastructure goes offline or disappears entirely.

### Q2: How do you handle a corrupt clerk entering false data before issuance?
> **Answer:** We do not solve source data-entry corruption — that is a physical/procedural problem outside the scope of cryptographic credentialing. What VERA guarantees is that **once data is committed and anchored, it cannot be quietly altered or forged afterward** without breaking the cryptographic validation.

### Q3: Is this real selective disclosure or just hidden UI fields?
> **Answer:** **It is 100% real cryptographic selective disclosure.** The university signs only a single Merkle Root. The student passport wallet dynamically constructs a Merkle proof path containing only the hashes of the sibling nodes for the disclosed fields. The undisclosed values are **completely omitted from the payload** and never sent to the verifier, but the verifier can still recompute and prove that the disclosed fields belong to the signed root.

### Q4: Did you implement zero-knowledge proofs?
> **Answer:** No. We implemented **Merkle-tree selective disclosure**, which is simpler, highly efficient, and runs client-side in milliseconds while providing the exact same privacy property (revealing only required fields). ZK-range proofs (e.g. proving a GPA is >8.5 without revealing the exact score) are a future extension.

### Q5: What if the institution disappears?
> **Answer:** The status registry and Merkle roots are anchored on the Polygon blockchain public ledger. Since verifiers check status and signatures directly against the smart contract, a credential remains fully verifiable even if the issuing university shuts down or its web servers fail.

---

## 2. Key Hackathon Pitch Differentiators

1. **"We don't digitize certificates"**
   * Do not pitch this as a "PDF validator." PDF validation is a commodity.
   * Pitch it as a **Decentralized Academic Trust and Verification Network**.
2. **Academic Consistency Engine (The "Trust Graph")**
   * *The Pitch:* "Other projects only check if a single document's signature is valid. VERA builds a relationship graph to check if the student's *academic history is logically consistent*. If a student claims a graduation degree but has no matching admission record, or has a migration certificate dated *before* admission, VERA flags it instantly."
3. **Student-Controlled Privacy**
   * The student has absolute authority over who can see their records, which specific fields are disclosed, and can revoke permission passes instantly, rendering the verification links invalid.
