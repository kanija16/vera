# VERA

VERA is a cryptographic academic-record verification system with student, institution, and verifier portals. This repository's demo uses a simulated local ledger with deployable contract semantics; Polygon deployment is intentionally configuration and operations work, not a capability claimed by the running demo.

# VERA — Decentralized Academic Trust & Migration Network
 
> ### Solving the "Garbage In, Immutable Garbage" Problem in Academic Credentials
 
VERA is a cryptographically verifiable academic credential infrastructure designed to go beyond simple document hashing.
 
Instead of asking only:
 
> **"Has this document been modified?"**
 
VERA also asks:
 
> **"Does this credential make sense within the student's academic history?"**
 
The system combines cryptographic integrity, academic sequence validation, selective disclosure, credential revocation, and blockchain anchoring to build a more trustworthy academic verification network.
 
---
 
## 🚀 The Problem
 
Most blockchain-based credential systems focus on one thing:
 
```
Document → Hash → Blockchain
```
 
This protects a document from being modified after issuance. However, there is a major flaw:
 
**A credential can be cryptographically authentic and still be logically fraudulent.**
 
### Example
 
Imagine a student has:
 
```
Migration Certificate
        ↓
Enrollment Record
        ↓
Semester Records
        ↓
Degree Certificate
```
 
But the migration certificate was issued *before* the enrollment event.
 
A traditional blockchain credential system may still verify the document because:
 
- The issuer signature is valid
- The document hash matches
- The blockchain record exists
But academically, the sequence is suspicious. This is the **"Garbage In, Immutable Garbage"** problem — once incorrect or fraudulent information is permanently anchored, blockchain immutability does not make that information trustworthy.
 
---
 
## 💡 The VERA Solution
 
VERA introduces an **Academic Truth Verification Engine** that validates credentials before they are trusted. The platform evaluates:
 
- Cryptographic integrity
- Authorized issuer legitimacy
- Academic event sequence
- Timeline consistency
- Student identity linkage
- Credential status
- Selective disclosure proofs
- Audit history
Only after passing these validation layers can a credential be considered trustworthy.
 
---
 
## 🎯 Core Problems Solved
 
| Problem | Traditional Systems | VERA |
|---|---|---|
| Document Tampering | Detectable through hashing | Cryptographic verification |
| Fake but Properly Signed Data | Often accepted | Academic consistency validation |
| Out-of-Sequence Credentials | Usually ignored | Timeline DAG validation |
| Manual Administrative Issuance | Slow and centralized | Batch credential processing |
| Full Transcript Exposure | Common requirement | Field-level selective disclosure |
| Credential Revocation | Often delayed | Status-based revocation |
| Central Server Downtime | Verification may fail | Blockchain audit anchoring |
| Unauthorized Issuers | Weak issuer control | Authorized issuer management |
 
---
 
## 🧠 What Makes VERA Different?
 
VERA is not simply:
 
```
PDF → Hash → Blockchain
```
 
Instead, it introduces an **Academic History Graph**. Each student's academic journey is represented as a sequence of connected events:
 
```
ENROLLMENT
     │
     ▼
SEMESTER_FINAL
     │
     ▼
SEMESTER_FINAL
     │
     ▼
DEGREE_AWARD
     │
     ▼
MIGRATION_REQ
```
 
VERA analyzes whether newly submitted academic events logically fit into this history. If an impossible or suspicious relationship is detected:
 
```
Trust Score < 0.85
        │
        ▼
SUSPICIOUS_REVIEW
```
 
The credential is prevented from automatically progressing as a trusted credential.
 
---
 
## 🏗 System Architecture
 
```
                         ┌──────────────────────────────┐
                         │        VERA PLATFORM         │
                         └──────────────┬───────────────┘
                                        │
                     ┌──────────────────┴──────────────────┐
                     │                                     │
                     ▼                                     ▼
          ┌──────────────────────┐              ┌──────────────────────┐
          │    OFF-CHAIN LAYER    │              │    ON-CHAIN LAYER    │
          └──────────────────────┘              └──────────────────────┘
 
          ┌──────────────────────┐              ┌──────────────────────┐
          │  PostgreSQL Database │              │  Academic Registry   │
          │                      │              │  Smart Contract      │
          │  • Student Data      │              │                      │
          │  • Academic Events   │              │  • Merkle Roots      │
          │  • Credentials       │              │  • Issuer Address    │
          │  • Permissions       │              │  • Credential Status │
          │  • Audit Logs        │              │  • Block Timestamp   │
          └──────────┬───────────┘              └──────────▲───────────┘
                     │                                     │
                     ▼                                     │
          ┌──────────────────────┐                          │
          │ Cryptographic Engine │                          │
          │                      │                          │
          │  • ECDSA Signatures  │                          │
          │  • SHA-256 Hashing   │                          │
          │  • Merkle Trees      │                          │
          └──────────┬───────────┘                          │
                     │                                      │
                     ▼                                      │
          ┌──────────────────────┐                          │
          │  Consistency Engine  │                          │
          │                      │                          │
          │  • Timeline Analysis │                          │
          │  • Sequence Rules    │                          │
          │  • Trust Scoring     │                          │
          └──────────┬───────────┘                          │
                     │                                      │
                     └──────────── Batch Anchoring ─────────┘
```
 
---
 
## 🔐 Core Architecture
 
VERA separates sensitive academic information from publicly verifiable cryptographic proofs.
 
```
                PRIVATE DATA
                     │
                     ▼
        ┌────────────────────────┐
        │      PostgreSQL         │
        │                        │
        │  • Student PII          │
        │  • Academic Records     │
        │  • Grades               │
        │  • Transcript Data      │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │ Cryptographic Processing│
        │                        │
        │  • Field Hashing        │
        │  • Unique Salts         │
        │  • Merkle Tree          │
        │  • Digital Signatures   │
        └───────────┬────────────┘
                    │
                    ▼
        ┌────────────────────────┐
        │      BLOCKCHAIN         │
        │                        │
        │  • Merkle Root          │
        │  • Credential Status    │
        │  • Issuer Reference     │
        │  • Timestamp            │
        └────────────────────────┘
```
 
No raw student transcript or sensitive personal information needs to be stored on-chain.
 
---
 
## ⚙️ Core Components
 
### 1. 🔐 Cryptographic Engine
 
**File:** `backend/app/crypto.py`
 
Responsible for cryptographic identity and signature verification.
 
**Responsibilities:**
- Key generation
- ECDSA signatures
- Signature verification
- Secure credential signing
The system uses **ECDSA (SECP256R1)** to establish cryptographic authenticity.
 
### 2. 🌳 Salted Merkle Tree Engine
 
**File:** `backend/app/merkle.py`
 
VERA does not hash an entire transcript as one block. Instead, it creates hashes for individual fields.
 
Conceptually:
 
```
Field Name + Field Value + Unique Salt → SHA-256 Hash
```
 
Mathematically:
 
```
Leaf Hash = SHA-256( Field Name || Field Value || Unique Salt )
```
 
Example transcript:
 
```json
{
  "student_name": "Emily White",
  "matriculation_no": "VIT2024001",
  "cgpa": "9.2",
  "degree": "B.Tech CSE"
}
```
 
Instead of exposing the entire credential, VERA can selectively prove `CGPA = 9.2` without revealing the student name, matriculation number, full transcript, or other sensitive information. This enables **Selective Disclosure**.
 
### 3. 🧠 Academic Consistency Engine
 
**File:** `backend/app/consistency.py`
 
This is one of the core innovations of VERA. The engine analyzes academic events as a connected timeline.
 
Supported event types include:
- `ENROLLMENT`
- `SEMESTER_FINAL`
- `DEGREE_AWARD`
- `MIGRATION_REQ`
The engine checks whether events follow logical academic progression.
 
Expected sequence:
 
```
ENROLLMENT
      │
      ▼
SEMESTER_FINAL
      │
      ▼
DEGREE_AWARD
```
 
A suspicious sequence could be:
 
```
DEGREE_AWARD → ENROLLMENT
```
 
or:
 
```
MIGRATION_REQ → ENROLLMENT
```
 
Such inconsistencies reduce the credential's trust score.
 
### 📊 Trust Scoring
 
VERA assigns a trust score between **0.0 and 1.0**:
 
| Trust Score | Result |
|---|---|
| 0.90 – 1.00 | High Trust |
| 0.85 – 0.89 | Valid but requires context |
| < 0.85 | Suspicious Review |
 
If the score falls below `0.85`, the event is marked `SUSPICIOUS_REVIEW`. This prevents suspicious academic events from being blindly trusted.
 
### 4. 🎓 Academic Credential Engine
 
VERA represents academic records as structured events:
 
```
Institution
      │
      ▼
Academic Event
      │
      ▼
Consistency Validation
      │
      ▼
Credential Generation
      │
      ▼
Merkle Root Generation
      │
      ▼
Blockchain Anchoring
```
 
Each credential contains cryptographic references to its originating academic event.
 
### 5. 🏛 Authorized Issuer Management
 
Institutions are represented as authorized entities. Each institution contains:
 
- Institution ID
- Institution Name
- Institution Code
- Public Key
- Verification Status
Only trusted and authorized institutions should be allowed to issue academic events into the VERA network. This helps reduce unauthorized credential issuance, fake universities, and untrusted credential sources.
 
### 6. 🪪 Student Passport
 
The Student Passport allows students to control access to their credentials.
 
```
Student
   │
   ▼
Select Credential
   │
   ▼
Choose Fields to Share
   │
   ▼
Generate Access Token
   │
   ▼
Verifier Access
```
 
Tokens can be issued for **1 hour**, **24 hours**, or **7 days**, and permissions can be revoked at any time.
 
#### 🔑 Permission Model
 
A permission contains:
- Permission ID
- Credential ID
- Student ID
- Verifier Email
- Access Token
- Expiration Time
- Revocation Status
This enables students to maintain control over who can access their credentials.
 
---
 
## 🧪 6-Layer Verification Engine
 
The `/verify` system evaluates credentials using multiple validation layers.
 
**Layer 1 — Token Validity**
- ✓ Token exists
- ✓ Token not expired
- ✓ Token not revoked
- ✓ Cryptographic validity
**Layer 2 — Credential Status**
Checks whether the credential is `ACTIVE` or `REVOKED`. A revoked credential immediately fails verification.
 
**Layer 3 — Merkle Integrity**
The verifier recomputes the Merkle proof:
 
```
Provided Data → Hash Recalculation → Merkle Root → Compare With Registered Root
```
 
If the roots do not match: `TAMPERING_DETECTED`
 
**Layer 4 — Student Identity Linkage**
The credential must correctly connect to the intended student:
- Credential → Student ID
- Academic Event → Student ID
- Permission → Student ID
This prevents credential reassignment or identity mismatch.
 
**Layer 5 — Academic Timeline Consistency**
The verifier checks whether the credential fits logically into the student's academic history:
 
```
Enrollment → Semester Completion → Degree Award
```
 
If the timeline contains contradictions: `SEQUENCE_ANOMALY`
 
**Layer 6 — Audit Integrity**
VERA records important actions, such as credential creation, verification, revocation, and permission grants/revocations.
 
---
 
## ⛓ Blockchain Layer
 
VERA is designed to use blockchain anchoring for public auditability. The blockchain stores cryptographic references rather than raw academic information.
 
**On-chain:**
- Merkle Root
- Issuer Address
- Credential Status
- Timestamp
- Credential Reference
**The following should NEVER be stored directly on-chain:**
- ❌ Student Name
- ❌ Email
- ❌ Address
- ❌ Grades
- ❌ Full Transcript
- ❌ Personally Identifiable Information
This architecture maintains privacy while preserving cryptographic verifiability.
 
---
 
## 🗃 Database Architecture
 
The backend currently contains the following major entities:
 
| Entity | Table | Description |
|---|---|---|
| Institution | `institution` | Represents an academic issuer |
| Student | `student` | Stores student identity information |
| Academic Event | `academic_event` | Represents academic milestones (`ENROLLMENT`, `SEMESTER_FINAL`, `DEGREE_AWARD`, `MIGRATION_REQ`) |
| Credential | `credential` | A generated academic credential — contains Merkle root, canonical payload hash, status, version |
| Credential Relationship | `credential_relationship` | Relationships between credentials (`precedes`, `supersedes`, `depends_on`) — builds the academic credential graph |
| Permission | `permission` | Controls verifier access to student credentials |
| Audit Log | `audit_log` | Stores system activity for traceability |
 
---
 
## 📂 Repository Structure
 
```
vera/
├── .gitignore
├── DEPLOYMENT.md
├── PITCH_NOTES.md
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   │
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models.py
│       ├── schemas.py
│       ├── seed.py
│       │
│       ├── crypto.py
│       ├── merkle.py
│       ├── consistency.py
│       ├── blockchain.py
│       │
│       ├── services/
│       │   ├── blockchain.py
│       │   ├── crypto.py
│       │   └── validator.py
│       │
│       ├── test_api.py
│       ├── test_crypto.py
│       ├── test_merkle.py
│       ├── test_consistency.py
│       └── test_v1_api.py
│
└── frontend/
    ├── package.json
    ├── next.config.ts
    │
    └── app/
        ├── page.tsx
        ├── issuer/
        ├── passport/
        ├── verify/
        └── demo/
```
 
---
 
## 🛠 Technology Stack
 
### Backend
 
| Technology | Purpose |
|---|---|
| Python | Backend development |
| FastAPI | REST API framework |
| SQLAlchemy | Database ORM |
| PostgreSQL | Primary relational database |
| AsyncPG | Async PostgreSQL driver |
| Pydantic | Request and response validation |
| Cryptography | ECDSA operations |
| Pytest | Testing |
| Docker | Containerization |
 
### Frontend
 
| Technology | Purpose |
|---|---|
| Next.js | Frontend framework |
| React | UI |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Axios | API communication |
| Lucide Icons | Interface icons |
 
### Blockchain
 
| Component | Purpose |
|---|---|
| Polygon Amoy | Test blockchain network |
| Academic Registry | Credential anchoring |
| Merkle Roots | Cryptographic proof |
| Credential Status | Revocation lifecycle |
 
---
 
## 🔄 Credential Lifecycle
 
```
┌────────────────────┐
│  Academic Event     │
│  Submitted          │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Issuer Validation  │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Consistency Engine │
│  Trust Scoring      │
└─────────┬──────────┘
          │
     ┌────┴─────┐
     │          │
     ▼          ▼
 TRUSTED     SUSPICIOUS
     │          │
     ▼          ▼
Credential   Manual Review
Generation
     │
     ▼
Merkle Root
Generation
     │
     ▼
Blockchain
Anchoring
     │
     ▼
Credential ACTIVE
```
 
---
 
## 🧪 Demo Scenarios
 
VERA is designed to demonstrate multiple attack and verification scenarios.
 
### Scenario A — Happy Path
 
```
Student Enrollment → Semester Completion → Degree Award
→ Credential Generated → Merkle Root Anchored
→ Student Shares Selected Fields → Verifier Checks Credential
→ 6/6 Verification Layers Pass
```
 
**Result:** `✓ VERIFIED`
 
### Scenario B — Database Grade Forgery
 
An attacker modifies a student's grade directly in the database (e.g., original CGPA `8.2` → modified `9.9`). The stored Merkle root still represents the original value.
 
```
Modified Data → New Hash → New Merkle Root → Does NOT Match Anchored Root
```
 
**Result:** `TAMPERING_DETECTED`
 
### Scenario C — Timeline Sequence Fraud
 
A suspicious event is introduced, e.g. `MIGRATION_CERTIFICATE → ENROLLMENT`. The consistency engine evaluates the timeline and the trust score drops.
 
**Result:** `SUSPICIOUS_REVIEW`
 
### Scenario D — Credential Revocation
 
An institution revokes a credential (`ACTIVE → REVOKED`). Future verification requests detect the revoked status.
 
**Result:** `CREDENTIAL_REVOKED`
 
---
 
## 🚀 Getting Started
 
### Prerequisites
 
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Docker (optional)
### 🐍 Backend Setup
 
```bash
cd backend
 
# Create a virtual environment
py -3.11 -m venv .venv
 
# Activate it (Windows PowerShell)
.\.venv\Scripts\Activate.ps1
 
# Install dependencies
pip install -r requirements.txt
```
 
#### Database Configuration
 
The backend reads the database connection from the `DATABASE_URL` environment variable:
 
```
postgresql://postgres:postgres@localhost:5432/vera
```
 
The application automatically converts this into the async PostgreSQL format required by SQLAlchemy:
 
```
postgresql+asyncpg://postgres:postgres@localhost:5432/vera
```
 
#### Run the Backend
 
```bash
uvicorn app.main:app --reload
```
 
- API: `http://127.0.0.1:8000`
- API documentation: `http://127.0.0.1:8000/docs`
### 🧪 Running Tests
 
```bash
pytest
```
 
Or run individual test files:
 
```bash
pytest app/test_api.py
pytest app/test_crypto.py
pytest app/test_merkle.py
pytest app/test_consistency.py
pytest app/test_v1_api.py
```
 
### 🌐 Frontend Setup
 
```bash
cd frontend
npm install
npm run dev
```
 
Open `http://localhost:3000`.
 
---
 
## 🖥 Main Platform Modules
 
### 🏛 Issuer Console — `/issuer`
 
Used by academic institutions.
 
- ✓ Manage academic events
- ✓ Issue credentials
- ✓ Batch processing
- ✓ Authorized issuer management
- ✓ Credential lifecycle management
### 🪪 Student Passport — `/passport`
 
Used by students.
 
- ✓ View credentials
- ✓ Control access
- ✓ Generate temporary permissions
- ✓ Selectively disclose fields
- ✓ Revoke verifier access
### 🔍 Verifier Portal — `/verify`
 
Used by employers, universities, and other credential verifiers.
 
- ✓ Validate access permissions
- ✓ Verify credential status
- ✓ Recompute cryptographic proofs
- ✓ Validate student linkage
- ✓ Analyze timeline consistency
- ✓ Inspect audit information
### 🧪 Interactive Demo — `/demo`
 
Allows the system to demonstrate:
 
- ✓ Normal verification
- ✓ Data tampering
- ✓ Sequence anomalies
- ✓ Credential revocation
---
 
## 🔒 Security Model
 
VERA follows a layered trust model:
 
```
Layer 1 — Access Control
        ↓
Layer 2 — Credential Status
        ↓
Layer 3 — Cryptographic Integrity
        ↓
Layer 4 — Identity Linkage
        ↓
Layer 5 — Academic Consistency
        ↓
Layer 6 — Audit Verification
```
 
A credential should not be considered trustworthy based on only one layer.
 
---
 
## 🔮 Future Roadmap
 
**Blockchain**
- [ ] Complete Polygon Amoy smart contract deployment
- [ ] Batch credential anchoring
- [ ] On-chain issuer registry
- [ ] Decentralized credential revocation
**Academic Intelligence**
- [ ] Advanced academic graph reasoning
- [ ] Institution relationship validation
- [ ] Cross-university migration verification
- [ ] Historical anomaly detection
**Privacy**
- [ ] Zero-Knowledge Proof integration
- [ ] Decentralized identity support
- [ ] W3C Verifiable Credentials compatibility
**Platform**
- [ ] Multi-university federation
- [ ] Employer verification dashboard
- [ ] Real-time verification analytics
- [ ] Production-grade RBAC
---
 
## 🎯 Vision
 
VERA aims to create a future where academic credentials are not trusted simply because *"the document exists"* or *"the hash matches."*
 
Instead, trust should be based on:
 
```
Cryptographic Integrity
        +
Authorized Issuance
        +
Academic Consistency
        +
Privacy-Preserving Verification
        +
Transparent Auditability
```
 
## 🧩 The Core Philosophy
 
> Blockchain can prove that data has not changed. VERA attempts to verify whether that data should have been trusted in the first place.
 
---
 
## 📜 License
 
This project is distributed under the MIT License.
 
---
 
## 👥 Project
 
**VERA — Decentralized Academic Trust & Migration Network**
 
Built to explore the intersection of blockchain, cryptography, academic credential verification, privacy engineering, and graph-based consistency validation.
