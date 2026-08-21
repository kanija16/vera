# VERA — Decentralized Academic Trust & Migration Network

VERA is a student-controlled academic credential infrastructure designed to solve a fundamental security flaw with traditional blockchain certificate systems.

Most blockchain credential systems only prove:
> "This document has not changed after being issued."

A fraudulent, logically inconsistent, or administratively manipulated record can still be signed and archived to a ledger. VERA introduces a pre-issuance **Academic Consistency & Trust Engine** that checks academic history chronology and logical integrity before anchoring cryptographic proofs to the registry.

---

## 🚀 Quick Start (Docker Compose)

To launch the complete VERA network (PostgreSQL, FastAPI backend, Next.js frontend):

1. **Verify you have Docker and Docker Compose installed.**
2. **Build and start the container orchestration:**
   ```bash
   docker compose up --build
   ```
3. **Access VERA Portals:**
   * **FastAPI Swagger Docs:** `http://localhost:8000/docs`
   * **Next.js Web Frontend:** `http://localhost:3000`

To tear down the containers and completely wipe all volumes:
```bash
docker compose down -v
```

---

## 🛡️ VERA Verification Pipeline (6-Layers)

During verification (`GET /api/v1/verify/{token}`), the backend executes six concurrent layers of security checks:
1. **Access Permission:** Validates that the student's HMAC sharing token exists, has not expired, and has not been manually revoked.
2. **Credential Status:** Queries the blockchain status registry to ensure it is `ACTIVE` (not administratively revoked).
3. **Cryptographic Integrity:** Recomputes the Salted Merkle Root using the off-chain payload + individual fields' salts and matches it against the on-chain registry.
4. **Student Identity Linkage:** Verifies that the credential's student ID matches the active student profile.
5. **Academic Timeline Consistency:** Evaluates sequence logic (e.g. migration certificates must strictly post-date degree awards).
6. **Audit Trail Integrity:** Cross-references the cryptographic signature history logs.

---

## 🧪 Demo Scenarios (Interactive on `/demo`)

Seeded data is loaded automatically on docker startup. Access `http://localhost:3000/demo` to trigger:

* **Scenario A — Happy Path:**
  * Shows Alice Smith's enrollment and graduation transcript traversing verification checks with a `VERIFIED` result.
* **Scenario B — Database Tampering:**
  * Simulates a SQL injection or malicious database admin altering a student's GPA in PostgreSQL.
  * The Merkle Root mismatch is caught instantly, returning a `409 Conflict: TAMPERING_DETECTED` block.
* **Scenario C — Timeline Anomaly:**
  * Emily White's seeded migration certificate (2021) predates her enrollment (2022).
  * VERA flags this chronological error as `SUSPICIOUS_REVIEW` and blocks automated anchoring.
* **Scenario D — Credential Revocation:**
  * University marks a credential as revoked. The verifier portal instantly displays the status as `REVOKED`.
