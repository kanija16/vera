# VERA: Deployment & Running Instructions

This file guides the team on running **VERA - Academic Trust Infrastructure** locally during the hackathon.

---

## 1. Backend Setup (FastAPI)

1. Open a terminal in the `backend/` directory.
2. Initialize virtual environment:
   ```bash
   python -m venv .venv
   ```
3. Activate virtual environment:
   * **Windows:** `.venv\Scripts\activate`
   * **macOS/Linux:** `source .venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the FastAPI application:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * *Note: The database auto-migrates and seeds default demo records on startup. If no PostgreSQL database is connected, it automatically falls back to a local SQLite database for offline demo resilience.*

---

## 2. Frontend Setup (Next.js)

1. Open a terminal in the `frontend/` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web dashboards at: `http://localhost:3000`

---

## 3. Demo Walkthrough Script (Judges' Scenario Guide)

Use the **Demo Control Sandbox** at `/demo` to easily show the visual states:

### Scenario A: The Happy Path
1. Go to **Student Passport** (`/passport`).
2. Click **Share Record** on the Transcript credential.
3. Toggle fields to share only `student_name`, `roll_number`, and `gpa` (omitting individual courses).
4. Set duration to `24h` and generate the pass.
5. Open the copyable link in a new incognito window (Simulating a Recruiter).
6. Verify status is **VERIFIED** (green checkmarks) and that hidden fields are completely missing.

### Scenario B: Tamper Detection
1. Go to the **Demo Control Sandbox** (`/demo`).
2. Click **Inject Forgery** to modify Emily's record directly in the database.
3. Open the Verifier portal and view the record (or go to `/verify/mock_tamper_pass`).
4. Confirm status changes to **TAMPERED** (red cross) with Merkle integrity failure.

### Scenario C: Consistency Engine Anomaly
1. Select **Emily White** in the Student Passport dropdown.
2. Observe the warning flag under Trust Status showing that her Migration Certificate date predates her B.Tech Admission date.
3. Open `/verify/mock_review_pass` to show the **REVIEW** state explaining the contradiction to verifiers.

### Scenario D: On-Chain Revocation
1. Go to the **Demo Control Sandbox** (`/demo`).
2. Click **Invalidate On-Chain** to write the revocation block.
3. Open the Verifier portal and view the record (or go to `/verify/mock_revoke_pass`).
4. Confirm status changes to **REVOKED** (red status) stating it was invalidated by the university.
