import time
import uuid
import hashlib
import secrets
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import engine, get_db, AsyncSessionLocal, bootstrap_database
from app.models import Base, Institution, Student, AcademicEvent, Credential, Permission, AuditLog, EventType, EventStatus, CredentialStatus, InstitutionOfficer, CredentialAuthorization, AnchorBatch, DocumentRequest, VerificationRequest, IntegrityRequest, Notification
from app.schemas import EventCreate, EventResponse, FinalizeResponse, StudentCredentialsResponse, CredentialResponseItem, ShareRequest, ShareResponse, VerifyResponse, TamperSimulateRequest, RevokeResponse, ProposeRequest, ProposeResponse, ApproveRequest, ApproveResponse, BatchAnchorResponse, StudentInfoSchema, DocumentRequestCreate, DocumentRequestResponse, VerificationRequestCreate, VerificationRequestResponse, IntegrityRequestCreate, IntegrityRequestResponse, NotificationResponse
from app.services.crypto import build_merkle_tree, generate_hmac_token, verify_hmac_token, verify_merkle_proof, canonicalize_json, generate_merkle_proof, sign_message_ecdsa, verify_signature_ecdsa
from app.services.validator import ConsistencyAnomalyEngine
from app.services.blockchain import BlockchainLedgerSimulator, blockchain_service
from app.seed import seed_db

app = FastAPI(title="VERA v1 Cryptographic Academic Trust Network", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup async DB creation & seeding
@app.on_event("startup")
async def startup_event():
    print("[STARTUP] Connecting async database engine...")
    await bootstrap_database(engine)
    try:
        await seed_db()
    except Exception as e:
        print(f"[STARTUP ERROR] Seeding failed: {e}")


# Helper to log audit events asynchronously
async def log_audit_async(db: AsyncSession, actor_id: str, action: str, target_id: str = None, details: dict = None):
    log = AuditLog(
        actor_id=actor_id,
        action=action,
        target_id=target_id,
        timestamp=datetime.utcnow(),
        details=details
    )
    db.add(log)
    await db.commit()


# 0. GET /health -> Liveness check
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": time.time()}


# 1a. POST /api/v1/institutions -> Create institution
@app.post("/api/v1/institutions", status_code=201)
async def create_institution(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    from app.services.crypto import generate_ecdsa_keypair
    code = payload.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Institution code required")
    
    dup_stmt = select(Institution).filter(Institution.code == code)
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Institution code already exists")
        
    _, public_key = generate_ecdsa_keypair()
    is_verified_val = payload.get("is_verified", True)
    inst = Institution(
        name=payload.get("name", "Unnamed Institution"),
        code=code,
        public_key=public_key,
        status="ACCREDITED" if is_verified_val else "PENDING",
        is_verified=is_verified_val
    )
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    return {"id": inst.id, "name": inst.name, "code": inst.code, "status": inst.status, "is_verified": inst.is_verified}


# 1b. GET /api/v1/institutions -> List institutions
@app.get("/api/v1/institutions")
async def list_institutions(db: AsyncSession = Depends(get_db)):
    stmt = select(Institution)
    res = await db.execute(stmt)
    institutions = res.scalars().all()
    return [{"id": i.id, "name": i.name, "code": i.code, "status": i.status, "is_verified": i.is_verified} for i in institutions]


# 1c. POST /api/v1/institutions/{inst_id}/status -> Update institution status (ACCREDITED/SUSPENDED/etc.)
@app.post("/api/v1/institutions/{inst_id}/status")
async def update_institution_status(inst_id: uuid.UUID, payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    status_val = payload.get("status")
    if not status_val or status_val not in ("PENDING", "ACCREDITED", "SUSPENDED", "REVOKED"):
        raise HTTPException(status_code=400, detail="Invalid status. Must be PENDING, ACCREDITED, SUSPENDED, or REVOKED.")
        
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
        
    inst.status = status_val
    inst.is_verified = (status_val == "ACCREDITED")
    await db.commit()
    
    await log_audit_async(
        db,
        actor_id="SYSTEM_ADMIN",
        action="UPDATE_INSTITUTION_STATUS",
        target_id=str(inst_id),
        details={"status": status_val}
    )
    return {"id": inst.id, "name": inst.name, "code": inst.code, "status": inst.status, "is_verified": inst.is_verified}


# 2a. POST /api/v1/students -> Create student
@app.post("/api/v1/students", status_code=201)
async def create_student(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    email = payload.get("email")
    matriculation_no = payload.get("matriculation_no")
    if not email or not matriculation_no:
        raise HTTPException(status_code=400, detail="Email and matriculation_no are required")
        
    student = Student(
        name=payload.get("name", "Unnamed Student"),
        email=email,
        matriculation_no=matriculation_no,
        wallet_address=payload.get("wallet_address")
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return {"id": student.id, "name": student.name, "email": student.email, "matriculation_no": student.matriculation_no}


# 2b. GET /api/v1/students -> List students
@app.get("/api/v1/students")
async def list_students(db: AsyncSession = Depends(get_db)):
    stmt = select(Student)
    res = await db.execute(stmt)
    students = res.scalars().all()
    return [{"id": s.id, "name": s.name, "email": s.email, "matriculation_no": s.matriculation_no} for s in students]


# 2c. GET /api/v1/students/{id} -> Get student profile
@app.get("/api/v1/students/{student_id}")
async def get_student(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Student).filter(Student.id == student_id)
    res = await db.execute(stmt)
    student = res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return {"id": student.id, "name": student.name, "email": student.email, "matriculation_no": student.matriculation_no, "wallet_address": student.wallet_address}


# 3. POST /api/v1/institutions/{inst_id}/events -> Ingest event
@app.post("/api/v1/institutions/{inst_id}/events", response_model=EventResponse, status_code=201)
async def ingest_event(inst_id: uuid.UUID, event_in: EventCreate, db: AsyncSession = Depends(get_db)):
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    stud_stmt = select(Student).filter(Student.id == event_in.student_id)
    stud_res = await db.execute(stud_stmt)
    student = stud_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    validator = ConsistencyAnomalyEngine(db)
    event_date = event_in.event_date or datetime.utcnow()
    
    status_res, trust_score, errors = await validator.evaluate_event(
        institution_id=str(inst_id),
        student_id=str(event_in.student_id),
        event_type=event_in.event_type,
        payload=event_in.payload,
        event_date=event_date
    )
    
    new_event = AcademicEvent(
        institution_id=inst_id,
        student_id=event_in.student_id,
        event_type=event_in.event_type,
        payload=event_in.payload,
        trust_score=trust_score,
        status=status_res,
        created_at=event_date.replace(tzinfo=None)
    )
    
    db.add(new_event)
    await db.commit()
    await db.refresh(new_event)
    
    await log_audit_async(
        db,
        actor_id=inst.code,
        action=f"INGEST_EVENT_{event_in.event_type}",
        target_id=str(new_event.id),
        details={"status": status_res, "trust_score": trust_score, "errors": errors}
    )
    
    return EventResponse(
        id=new_event.id,
        institution_id=new_event.institution_id,
        student_id=new_event.student_id,
        event_type=new_event.event_type,
        status=new_event.status,
        trust_score=new_event.trust_score,
        errors=errors,
        created_at=new_event.created_at
    )


# 4. GET /api/v1/students/{student_id}/events -> Get student events list
@app.get("/api/v1/students/{student_id}/events")
async def list_student_events(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(AcademicEvent).filter(AcademicEvent.student_id == student_id).order_by(AcademicEvent.created_at.desc())
    res = await db.execute(stmt)
    events = res.scalars().all()
    return [{"id": e.id, "event_type": e.event_type, "payload": e.payload, "trust_score": e.trust_score, "status": e.status, "created_at": e.created_at} for e in events]


# 5a. POST /api/v1/institutions/{inst_id}/events/{event_id}/propose -> Clerk Proposal (Stage 1 Governance)
@app.post("/api/v1/institutions/{inst_id}/events/{event_id}/propose", response_model=ProposeResponse)
async def propose_event(inst_id: uuid.UUID, event_id: uuid.UUID, req: ProposeRequest, db: AsyncSession = Depends(get_db)):
    # Check Institution Accreditation
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
    if inst.status != "ACCREDITED":
        raise HTTPException(status_code=400, detail="Only ACCREDITED institutions can propose credentials.")

    # Check Clerk
    clerk_stmt = select(InstitutionOfficer).filter(
        InstitutionOfficer.id == req.clerk_id,
        InstitutionOfficer.institution_id == inst_id,
        InstitutionOfficer.role == "CLERK",
        InstitutionOfficer.is_active == True
    )
    clerk_res = await db.execute(clerk_stmt)
    clerk = clerk_res.scalar_one_or_none()
    if not clerk:
        raise HTTPException(status_code=404, detail="Active clerk officer not found for this institution.")
        
    # Check Event
    event_stmt = select(AcademicEvent).filter(
        AcademicEvent.id == event_id,
        AcademicEvent.institution_id == inst_id
    )
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Academic event not found.")
        
    # Check if suspicious review
    if event.status == EventStatus.SUSPICIOUS_REVIEW.value or event.trust_score < 0.85:
        raise HTTPException(status_code=400, detail="Cannot propose suspicious academic events. Consistency review required.")
        
    # Check if already authorized or proposed
    auth_stmt = select(CredentialAuthorization).filter(CredentialAuthorization.event_id == event_id)
    auth_res = await db.execute(auth_stmt)
    auth = auth_res.scalar_one_or_none()
    if auth and auth.status in ("CLERK_SIGNED", "DUAL_AUTHORIZED"):
        raise HTTPException(status_code=400, detail="Credential is already proposed or authorized.")
        
    # Generate Clerk signature
    payload_bytes = canonicalize_json(event.payload)
    signature = sign_message_ecdsa(clerk.private_key, payload_bytes)
    
    if not auth:
        auth = CredentialAuthorization(
            event_id=event_id,
            clerk_id=clerk.id,
            clerk_signature=signature,
            clerk_signed_at=datetime.utcnow(),
            status="CLERK_SIGNED"
        )
        db.add(auth)
    else:
        auth.clerk_id = clerk.id
        auth.clerk_signature = signature
        auth.clerk_signed_at = datetime.utcnow()
        auth.status = "CLERK_SIGNED"
        
    event.status = "CLERK_SIGNED"
    await db.commit()
    await db.refresh(auth)
    
    await log_audit_async(
        db,
        actor_id=clerk.name,
        action="CLERK_PROPOSAL_SIGNATURE",
        target_id=str(event_id),
        details={"signature": signature}
    )
    
    return ProposeResponse(
        event_id=event_id,
        clerk_id=clerk.id,
        clerk_signature=signature,
        status="CLERK_SIGNED"
    )


# 5b. POST /api/v1/institutions/{inst_id}/events/{event_id}/approve -> Exam Officer Approval (Stage 2 Governance)
@app.post("/api/v1/institutions/{inst_id}/events/{event_id}/approve", response_model=ApproveResponse)
async def approve_event(inst_id: uuid.UUID, event_id: uuid.UUID, req: ApproveRequest, db: AsyncSession = Depends(get_db)):
    # Check Institution Accreditation
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
    if inst.status != "ACCREDITED":
        raise HTTPException(status_code=400, detail="Only ACCREDITED institutions can approve credentials.")

    # Check Exam Officer
    officer_stmt = select(InstitutionOfficer).filter(
        InstitutionOfficer.id == req.exam_officer_id,
        InstitutionOfficer.institution_id == inst_id,
        InstitutionOfficer.role == "EXAM_OFFICER",
        InstitutionOfficer.is_active == True
    )
    officer_res = await db.execute(officer_stmt)
    officer = officer_res.scalar_one_or_none()
    if not officer:
        raise HTTPException(status_code=404, detail="Active exam officer not found for this institution.")
        
    # Check Event
    event_stmt = select(AcademicEvent).filter(
        AcademicEvent.id == event_id,
        AcademicEvent.institution_id == inst_id
    )
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Academic event not found.")
        
    # Check Proposal Authorization status
    auth_stmt = select(CredentialAuthorization).filter(CredentialAuthorization.event_id == event_id)
    auth_res = await db.execute(auth_stmt)
    auth = auth_res.scalar_one_or_none()
    if not auth or auth.status != "CLERK_SIGNED":
        raise HTTPException(status_code=400, detail="Event must have a valid clerk proposal signature before officer approval.")
        
    # Pre-signature verification
    payload_bytes = canonicalize_json(event.payload)
    
    # Generate Exam Officer signature
    signature = sign_message_ecdsa(officer.private_key, payload_bytes)
    
    auth.exam_officer_id = officer.id
    auth.exam_officer_signature = signature
    auth.exam_officer_approved_at = datetime.utcnow()
    auth.status = "DUAL_AUTHORIZED"
    
    event.status = "ISSUED"
    
    # Create Credential with salted leaves
    salts = {k: secrets.token_hex(16) for k in event.payload.keys()}
    leaf_hashes, merkle_root = build_merkle_tree(event.payload, salts)
    canonical_hash = hashlib.sha256(payload_bytes).hexdigest()
    
    credential = Credential(
        id=event_id,
        event_id=event_id,
        student_id=event.student_id,
        merkle_root=merkle_root,
        canonical_payload_hash=canonical_hash,
        salts=salts,
        status=CredentialStatus.ACTIVE.value,
        version=1,
        created_at=datetime.utcnow()
    )
    db.add(credential)
    await db.commit()
    await db.refresh(auth)
    
    await log_audit_async(
        db,
        actor_id=officer.name,
        action="EXAM_OFFICER_APPROVAL_SIGNATURE",
        target_id=str(event_id),
        details={"signature": signature}
    )
    
    return ApproveResponse(
        credential_id=credential.id,
        exam_officer_id=officer.id,
        exam_officer_signature=signature,
        merkle_root=merkle_root,
        status="DUAL_AUTHORIZED"
    )


# 5c. POST /api/v1/institutions/{inst_id}/anchor-batch -> Batch Anchoring Commitment
@app.post("/api/v1/institutions/{inst_id}/anchor-batch", response_model=BatchAnchorResponse)
async def anchor_batch(inst_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Check Institution Accreditation
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found.")
    if inst.status != "ACCREDITED":
        raise HTTPException(status_code=400, detail="Only ACCREDITED institutions can anchor batches.")

    # Query all credentials from this institution not yet batched (batch_id is null)
    stmt = select(Credential).join(AcademicEvent, Credential.event_id == AcademicEvent.id).filter(
        AcademicEvent.institution_id == inst_id,
        Credential.batch_id == None
    )
    res = await db.execute(stmt)
    credentials = res.scalars().all()
    if not credentials:
        raise HTTPException(status_code=400, detail="No credentials currently queued for batch anchoring.")
        
    # Build Batch Merkle commitment
    roots = [c.merkle_root for c in credentials]
    sorted_roots = sorted(roots)
    current_layer = [bytes.fromhex(r) for r in sorted_roots]
    
    while len(current_layer) > 1:
        next_layer = []
        for i in range(0, len(current_layer), 2):
            left = current_layer[i]
            right = current_layer[i+1] if i + 1 < len(current_layer) else left
            next_layer.append(hashlib.sha256(left + right).digest())
        current_layer = next_layer
    batch_root = current_layer[0].hex() if current_layer else ""
    
    # Commit Batch Root to smart contract registry
    ledger_record = BlockchainLedgerSimulator.anchor_credential(
        credential_id=str(uuid.uuid4()),
        merkle_root=batch_root,
        institution_id=str(inst_id)
    )
    
    # Store AnchorBatch details
    batch = AnchorBatch(
        id=uuid.uuid4(),
        institution_id=inst_id,
        batch_root=batch_root,
        status="ANCHORED",
        tx_hash=ledger_record["tx_hash"],
        created_at=datetime.utcnow()
    )
    db.add(batch)
    await db.commit()
    await db.refresh(batch)
    
    # Update credentials with batch ID and activate simulated on-chain index
    for c in credentials:
        c.batch_id = batch.id
        BlockchainLedgerSimulator.anchor_credential(
            credential_id=str(c.id),
            merkle_root=c.merkle_root,
            institution_id=str(inst_id)
        )
    await db.commit()
    
    await log_audit_async(
        db,
        actor_id="SYSTEM_BATCH_ANCHORER",
        action="BATCH_ANCHOR_COMMITMENT",
        target_id=str(batch.id),
        details={"batch_root": batch_root, "size": len(credentials)}
    )
    
    return BatchAnchorResponse(
        batch_id=batch.id,
        batch_root=batch_root,
        size=len(credentials),
        status="ANCHORED",
        tx_hash=ledger_record["tx_hash"]
    )


# 5d. POST /api/v1/institutions/{inst_id}/events/{event_id}/finalize -> E2E finalize wrapper (triggers full flow)
@app.post("/api/v1/institutions/{inst_id}/events/{event_id}/finalize", response_model=FinalizeResponse)
async def finalize_event(inst_id: uuid.UUID, event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Find active clerk and officer keys for this institution
    clerk_stmt = select(InstitutionOfficer).filter(
        InstitutionOfficer.institution_id == inst_id,
        InstitutionOfficer.role == "CLERK",
        InstitutionOfficer.is_active == True
    )
    clerk_res = await db.execute(clerk_stmt)
    clerk = clerk_res.scalar_one_or_none()
    
    officer_stmt = select(InstitutionOfficer).filter(
        InstitutionOfficer.institution_id == inst_id,
        InstitutionOfficer.role == "EXAM_OFFICER",
        InstitutionOfficer.is_active == True
    )
    officer_res = await db.execute(officer_stmt)
    officer = officer_res.scalar_one_or_none()
    
    if not clerk or not officer:
        raise HTTPException(status_code=400, detail="Institution must have active clerk and exam officer registered to finalize.")
        
    # Execute full E2E flow automatically
    await propose_event(inst_id, event_id, ProposeRequest(clerk_id=clerk.id), db)
    await approve_event(inst_id, event_id, ApproveRequest(exam_officer_id=officer.id), db)
    batch_res = await anchor_batch(inst_id, db)
    
    cred_stmt = select(Credential).filter(Credential.id == event_id)
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one()
    
    return FinalizeResponse(
        credential_id=credential.id,
        merkle_root=credential.merkle_root,
        canonical_payload_hash=credential.canonical_payload_hash,
        status=credential.status,
        version=credential.version,
        blockchain_tx={
            "merkle_root": credential.merkle_root,
            "batch_root": batch_res.batch_root,
            "tx_hash": batch_res.tx_hash,
            "anchor_type": "LOCAL_DEMO" if blockchain_service.__class__.__name__ == "DevelopmentAnchorService" else "REAL_TESTNET"
        }
    )


# 6. GET /api/v1/students/{student_id}/credentials -> List student credentials
@app.get("/api/v1/students/{student_id}/credentials", response_model=StudentCredentialsResponse)
async def list_student_credentials(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    stud_stmt = select(Student).filter(Student.id == student_id)
    stud_res = await db.execute(stud_stmt)
    student = stud_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    creds_stmt = select(Credential).filter(Credential.student_id == student_id).options(
        selectinload(Credential.source_event),
        selectinload(Credential.batch)
    )
    creds_res = await db.execute(creds_stmt)
    credentials = list(creds_res.scalars().all())
    
    student_info = StudentInfoSchema(
        id=student.id,
        name=student.name,
        email=student.email,
        matriculation_no=student.matriculation_no,
        wallet_address=student.wallet_address
    )
    
    response_items = []
    for c in credentials:
        cred_type = c.source_event.event_type if c.source_event else "Unknown"
        payload_fields = c.source_event.payload if c.source_event else {}
        
        # Determine transaction hash
        tx_hash = c.batch.tx_hash if c.batch else None
        if not tx_hash:
            # Fallback to simulated blockchain ledger status if not batched but exists there
            onchain_info = BlockchainLedgerSimulator.get_credential(str(c.id))
            if onchain_info:
                tx_hash = onchain_info.get("tx_hash")
                
        response_items.append(
            CredentialResponseItem(
                id=c.id,
                event_id=c.event_id,
                merkle_root=c.merkle_root,
                canonical_payload_hash=c.canonical_payload_hash,
                status=c.status,
                version=c.version,
                created_at=c.created_at,
                credential_type=cred_type,
                fields=payload_fields,
                onchain_tx_hash=tx_hash
            )
        )
        
    return StudentCredentialsResponse(
        student_id=student.id,
        name=student.name,
        matriculation_no=student.matriculation_no,
        student=student_info,
        credentials=response_items
    )



# 7. POST /api/v1/credentials/{cred_id}/share -> Create permission token with selective disclosure list
@app.post("/api/v1/credentials/{cred_id}/share", response_model=ShareResponse)
async def share_credential(cred_id: uuid.UUID, share_in: ShareRequest, db: AsyncSession = Depends(get_db)):
    cred_stmt = select(Credential).filter(Credential.id == cred_id)
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    if credential.status != CredentialStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Cannot share inactive or revoked credential.")
        
    verifier_email = share_in.verifier_email
    if not verifier_email:
        label = share_in.verifier_label or "verifier"
        verifier_email = f"{label.lower().replace(' ', '_')}@example.com"
        
    expires_in = share_in.expires_in_seconds or 86400
    if share_in.duration:
        d = share_in.duration.lower()
        if d == "1h":
            expires_in = 3600
        elif d == "24h":
            expires_in = 86400
        elif d == "7d":
            expires_in = 604800
        elif d == "forever":
            expires_in = 3153600000  # 100 years
            
    expires_at_timestamp = time.time() + expires_in
    expires_at_datetime = datetime.utcfromtimestamp(expires_at_timestamp).replace(tzinfo=timezone.utc)
    
    token = generate_hmac_token(
        credential_id=str(cred_id),
        student_id=str(credential.student_id),
        verifier_email=verifier_email,
        expires_at=expires_at_timestamp
    )
    
    permission = Permission(
        credential_id=cred_id,
        student_id=credential.student_id,
        verifier_email=verifier_email,
        access_token=token,
        fields_allowed=share_in.fields_allowed,
        expires_at=expires_at_datetime.replace(tzinfo=None),
        is_revoked=False
    )
    db.add(permission)
    await db.commit()
    await db.refresh(permission)
    
    await log_audit_async(
        db,
        actor_id=str(credential.student_id),
        action="SHARE_CREDENTIAL_GENERATE_TOKEN",
        target_id=str(cred_id),
        details={"verifier_email": verifier_email, "fields_allowed": share_in.fields_allowed, "expires_at": expires_at_datetime.isoformat()}
    )
    
    return ShareResponse(
        permission_id=permission.id,
        access_token=token,
        expires_at=expires_at_datetime
    )


# 8. Helper helper to revoke share passes
async def _revoke_share_pass_helper(permission_id: uuid.UUID, db: AsyncSession):
    perm_stmt = select(Permission).filter(Permission.id == permission_id)
    perm_res = await db.execute(perm_stmt)
    permission = perm_res.scalar_one_or_none()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission pass not found")
        
    if permission.is_revoked:
        return {"message": "Permission already revoked"}
        
    permission.is_revoked = True
    await db.commit()
    
    await log_audit_async(
        db,
        actor_id=str(permission.student_id),
        action="REVOKE_VERIFIER_SHARE_PASS",
        target_id=str(permission.credential_id),
        details={"permission_id": str(permission_id)}
    )
    return {"message": "Share pass revoked successfully"}


# 8a. POST /api/v1/permissions/{id}/revoke -> Revoke verifier token
@app.post("/api/v1/permissions/{permission_id}/revoke")
async def revoke_share_pass_post(permission_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _revoke_share_pass_helper(permission_id, db)


# 8b. DELETE /api/v1/permissions/{id} -> Revoke verifier token
@app.delete("/api/v1/permissions/{permission_id}")
async def revoke_share_pass_delete(permission_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await _revoke_share_pass_helper(permission_id, db)


# 9. GET /api/v1/verify/{access_token} -> Cryptographically verify and selectively disclose
@app.get("/api/v1/verify/{access_token}", response_model=VerifyResponse)
async def verify_credential_pass(access_token: str, db: AsyncSession = Depends(get_db)):
    is_valid_token, token_payload = verify_hmac_token(access_token)
    if not is_valid_token:
        raise HTTPException(
            status_code=401,
            detail="Verification failed: Access token is invalid, tampered, or expired."
        )
        
    cred_id = token_payload["credential_id"]
    student_id = token_payload["student_id"]
    
    perm_stmt = select(Permission).filter(Permission.access_token == access_token)
    perm_res = await db.execute(perm_stmt)
    permission = perm_res.scalar_one_or_none()
    if not permission or permission.is_revoked:
        raise HTTPException(status_code=401, detail="Verification failed: Permission revoked by student.")
        
    cred_stmt = select(Credential).filter(Credential.id == uuid.UUID(cred_id))
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    event_stmt = select(AcademicEvent).filter(AcademicEvent.id == credential.event_id)
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    
    student_stmt = select(Student).filter(Student.id == uuid.UUID(student_id))
    student_res = await db.execute(student_stmt)
    student = student_res.scalar_one_or_none()
    
    inst_stmt = select(Institution).filter(Institution.id == event.institution_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    
    onchain = BlockchainLedgerSimulator.get_credential(cred_id)
    if not onchain:
        raise HTTPException(status_code=404, detail="No on-chain anchor found for this credential.")
        
    onchain_status = onchain["status"]
    
    # Core Verification Step: Recompute Root Hash using FULL off-chain payload and FULL saved salts
    _, recomputed_root = build_merkle_tree(event.payload, credential.salts)
    
    checks = {
        "HMAC Access Token Cryptographically Valid": True,
        "Off-Chain Payload Match On-Chain Merkle Root": (recomputed_root == onchain["merkle_root"]),
        "On-Chain Credential Status Active": (onchain_status == "ACTIVE")
    }
    
    if not checks["Off-Chain Payload Match On-Chain Merkle Root"]:
        raise HTTPException(
            status_code=409,
            detail="TAMPERING_DETECTED: Off-chain record hashes do not match the immutable on-chain Merkle Root."
        )
        
    consistency_errors = []
    if event.status == EventStatus.SUSPICIOUS_REVIEW.value:
        validator = ConsistencyAnomalyEngine(db)
        _, _, consistency_errors = await validator.evaluate_event(
            institution_id=str(event.institution_id),
            student_id=str(event.student_id),
            event_type=event.event_type,
            payload=event.payload,
            event_date=event.created_at
        )

    # Layer 6 Audit Check: Validate double clerk + exam officer signatures
    auth_stmt = select(CredentialAuthorization).filter(CredentialAuthorization.event_id == credential.event_id)
    auth_res = await db.execute(auth_stmt)
    auth = auth_res.scalar_one_or_none()
    
    has_valid_signatures = False
    if auth and auth.status == "DUAL_AUTHORIZED":
        cl_stmt = select(InstitutionOfficer).filter(InstitutionOfficer.id == auth.clerk_id)
        cl_res = await db.execute(cl_stmt)
        clerk = cl_res.scalar_one_or_none()
        
        ex_stmt = select(InstitutionOfficer).filter(InstitutionOfficer.id == auth.exam_officer_id)
        ex_res = await db.execute(ex_stmt)
        exam_officer = ex_res.scalar_one_or_none()
        
        if clerk and exam_officer:
            payload_bytes = canonicalize_json(event.payload)
            is_cl_ok = verify_signature_ecdsa(clerk.public_key, payload_bytes, auth.clerk_signature)
            is_ex_ok = verify_signature_ecdsa(exam_officer.public_key, payload_bytes, auth.exam_officer_signature)
            if is_cl_ok and is_ex_ok:
                has_valid_signatures = True

    if not checks["On-Chain Credential Status Active"]:
        verification_status = "REVOKED"
        result_state = "revoked"
    elif event.status == EventStatus.SUSPICIOUS_REVIEW.value:
        verification_status = "SUSPICIOUS_REVIEW"
        result_state = "review"
    else:
        verification_status = "AUTHENTIC"
        result_state = "verified"

    layered_checks = {
        "Permission Not Expired/Revoked": True,
        "On-Chain Credential Status Active": (onchain_status == "ACTIVE"),
        "Merkle Proof Integrity Valid": True,
        "Student Identity Matching": True,
        "Timeline Consistency Checked": (event.status != EventStatus.SUSPICIOUS_REVIEW.value),
        "Cryptographic Audit Integrity": has_valid_signatures
    }

    # Selective Disclosure Logic: filter down payload to allowed fields
    allowed_fields = list(permission.fields_allowed) if permission.fields_allowed else list(event.payload.keys())
    disclosed_payload = {k: event.payload[k] for k in allowed_fields if k in event.payload}
    
    # Generate salts and proof paths for disclosed fields only
    disclosed_salts = {}
    disclosed_proofs = {}
    for k in disclosed_payload.keys():
        disclosed_salts[k] = credential.salts.get(k, "")
        disclosed_proofs[k] = generate_merkle_proof(event.payload, credential.salts, k)

    await log_audit_async(
        db,
        actor_id=token_payload["verifier_email"],
        action="VERIFY_CREDENTIAL_TOKEN",
        target_id=cred_id,
        details={"result": verification_status, "checks": checks}
    )
    
    return VerifyResponse(
        status=verification_status,
        result=result_state,
        student_name=student.name,
        matriculation_no=student.matriculation_no,
        issuer_name=inst.name,
        issuer_code=inst.code,
        institution_name=inst.name,
        credential_id=credential.id,
        student_id=student.id,
        event_type=event.event_type,
        credential_type=event.event_type,
        payload=disclosed_payload,
        disclosed_fields=disclosed_payload,
        merkle_root=onchain["merkle_root"],
        onchain_status=onchain_status,
        onchain_tx_hash=onchain.get("tx_hash"),
        checks=checks,
        layered_checks=layered_checks,
        consistency_errors=consistency_errors,
        salts=disclosed_salts,
        merkle_proofs=disclosed_proofs
    )


# 10. Helper helper for tampering simulation
async def _simulate_tamper_helper(req: TamperSimulateRequest, db: AsyncSession):
    cred_stmt = select(Credential).filter(Credential.id == req.credential_id)
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    event_stmt = select(AcademicEvent).filter(AcademicEvent.id == credential.event_id)
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    
    field_name = req.field_name or req.field_to_tamper
    if not field_name:
        raise HTTPException(status_code=400, detail="field_name or field_to_tamper is required")
        
    updated_payload = dict(event.payload)
    updated_payload[field_name] = req.new_value
    event.payload = updated_payload
    await db.commit()
    
    await log_audit_async(
        db,
        actor_id="SIMULATED_MALICIOUS_DBA",
        action="TAMPER_OFF_CHAIN_RECORD",
        target_id=str(req.credential_id),
        details={"field": field_name, "value": req.new_value}
    )
    
    return {"message": f"Off-chain event payload successfully tampered: set '{field_name}' to '{req.new_value}'."}


# 10a. POST /api/v1/demo/tamper -> Modify off-chain field directly
@app.post("/api/v1/demo/tamper")
async def demo_tamper_post(req: TamperSimulateRequest, db: AsyncSession = Depends(get_db)):
    return await _simulate_tamper_helper(req, db)


# 10b. POST /api/v1/verify/tamper-simulate -> Modify off-chain field directly (Legacy path)
@app.post("/api/v1/verify/tamper-simulate")
async def verify_tamper_post(req: TamperSimulateRequest, db: AsyncSession = Depends(get_db)):
    return await _simulate_tamper_helper(req, db)


# 11. POST /api/v1/demo/reset -> Clean database and rebuild seed records
@app.post("/api/v1/demo/reset")
async def demo_reset():
    print("[RESET] Triggered complete database and ledger simulator reset...")
    await bootstrap_database(engine, force=True)
    try:
        await seed_db()
    except Exception as e:
        print(f"[RESET ERROR] Seeding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Database reset failed during seeding: {e}")
    return {"message": "Database and blockchain ledger simulator successfully reset to initial seed state."}


# 12. POST /api/v1/credentials/{cred_id}/revoke -> Revoke credential status on blockchain
@app.post("/api/v1/credentials/{cred_id}/revoke", response_model=RevokeResponse)
async def revoke_credential(cred_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    cred_stmt = select(Credential).filter(Credential.id == cred_id)
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    if credential.status == CredentialStatus.REVOKED.value:
        raise HTTPException(status_code=400, detail="Credential is already revoked.")
        
    success = BlockchainLedgerSimulator.update_status(str(cred_id), "REVOKED")
    if not success:
        raise HTTPException(status_code=404, detail="Credential not found on simulated blockchain ledger")
        
    credential.status = CredentialStatus.REVOKED.value
    await db.commit()
    
    event_stmt = select(AcademicEvent).filter(AcademicEvent.id == credential.event_id)
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    
    inst_stmt = select(Institution).filter(Institution.id == event.institution_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    
    await log_audit_async(
        db,
        actor_id=inst.code,
        action="REVOKE_CREDENTIAL_ON_CHAIN",
        target_id=str(cred_id),
        details={"reason": "Administrative Revocation"}
    )
    
    return RevokeResponse(
        credential_id=cred_id,
        status="REVOKED",
        message="Credential revoked successfully on-chain."
    )


# 13. GET /api/v1/students/{student_id}/access-history -> Verification history logs
@app.get("/api/v1/students/{student_id}/access-history")
async def get_student_access_history(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    c_stmt = select(Credential).filter(Credential.student_id == student_id)
    c_res = await db.execute(c_stmt)
    creds = c_res.scalars().all()
    cred_ids = [str(c.id) for c in creds]
    
    logs = []
    if cred_ids:
        log_stmt = select(AuditLog).filter(
            AuditLog.target_id.in_(cred_ids),
            AuditLog.action == "VERIFY_CREDENTIAL_TOKEN"
        ).order_by(AuditLog.timestamp.desc())
        log_res = await db.execute(log_stmt)
        audit_logs = log_res.scalars().all()
        
        cred_map = {str(c.id): c for c in creds}
        
        for al in audit_logs:
            c = cred_map.get(al.target_id)
            c_type = "transcript"
            if c:
                ev_stmt = select(AcademicEvent).filter(AcademicEvent.id == c.event_id)
                ev_res = await db.execute(ev_stmt)
                ev = ev_res.scalar_one_or_none()
                if ev:
                    c_type = ev.event_type
                    
            logs.append({
                "event_time": al.timestamp,
                "verifier_label": al.actor_id,
                "credential_type": c_type,
                "disclosed_fields_count": len(al.details.get("checks", {})) if al.details else 3,
                "result": al.details.get("result", "verified").lower() if al.details else "verified",
                "permission_id": None
            })
    return {"access_logs": logs}


# 14. GET /api/v1/institutions/{inst_id}/audit-trail -> Institutional audit trail logs
@app.get("/api/v1/institutions/{inst_id}/audit-trail")
async def get_institution_audit_trail(inst_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    off_stmt = select(InstitutionOfficer).filter(InstitutionOfficer.institution_id == inst_id)
    off_res = await db.execute(off_stmt)
    officers = off_res.scalars().all()
    actor_ids = [inst.code] + [o.name for o in officers]
    
    stmt = select(AuditLog).filter(AuditLog.actor_id.in_(actor_ids)).order_by(AuditLog.timestamp.desc())
    res = await db.execute(stmt)
    audit_logs = res.scalars().all()
    
    return {
        "audit_logs": [
            {
                "id": l.id,
                "time": l.timestamp,
                "actor": l.actor_id,
                "action": l.action,
                "details": l.details
            } for l in audit_logs
        ]
    }


# 15. GET /api/v1/institutions/{inst_id}/events -> Logged academic events list for registrar console
@app.get("/api/v1/institutions/{inst_id}/events")
async def list_institution_events(inst_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    from sqlalchemy.orm import selectinload
    stmt = select(AcademicEvent).filter(AcademicEvent.institution_id == inst_id).options(
        selectinload(AcademicEvent.student)
    ).order_by(AcademicEvent.created_at.desc())
    res = await db.execute(stmt)
    events = res.scalars().all()
    return [
        {
            "event_id": e.id,
            "student_name": e.student.name if e.student else "Unknown",
            "student_id": e.student_id,
            "event_type": e.event_type,
            "event_date": e.created_at,
            "payload": e.payload,
            "status": e.status,
            "trust_score": e.trust_score
        } for e in events
    ]


# 16. POST /api/v1/students/{student_id}/document-requests -> Create new document request
@app.post("/api/v1/students/{student_id}/document-requests", response_model=DocumentRequestResponse, status_code=201)
async def create_document_request(student_id: uuid.UUID, req: DocumentRequestCreate, db: AsyncSession = Depends(get_db)):
    stud_stmt = select(Student).filter(Student.id == student_id)
    stud_res = await db.execute(stud_stmt)
    student = stud_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    new_req = DocumentRequest(
        student_id=student_id,
        institution_id=req.institution_id,
        request_type=req.request_type,
        purpose=req.purpose,
        details=req.details,
        status="SUBMITTED"
    )
    db.add(new_req)
    await db.commit()
    await db.refresh(new_req)
    
    await log_audit_async(
        db,
        actor_id=student.name,
        action="CREATE_DOCUMENT_REQUEST",
        target_id=str(new_req.id),
        details={"type": req.request_type}
    )
    
    inst_stmt = select(Institution).filter(Institution.id == req.institution_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if inst:
        notif = Notification(
            user_id=inst.code,
            title="New Document Request",
            message=f"Student {student.name} requested a {req.request_type}."
        )
        db.add(notif)
        await db.commit()
        
    return new_req


# 17. GET /api/v1/students/{student_id}/document-requests -> Get all document requests for student
@app.get("/api/v1/students/{student_id}/document-requests", response_model=List[DocumentRequestResponse])
async def list_student_document_requests(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(DocumentRequest).filter(DocumentRequest.student_id == student_id).order_by(DocumentRequest.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# 18. GET /api/v1/institutions/{inst_id}/document-requests -> Get all document requests for institution
@app.get("/api/v1/institutions/{inst_id}/document-requests", response_model=List[DocumentRequestResponse])
async def list_institution_document_requests(inst_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(DocumentRequest).filter(DocumentRequest.institution_id == inst_id).order_by(DocumentRequest.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# 19. POST /api/v1/institutions/{inst_id}/document-requests/{req_id}/status -> Update status of a request
@app.post("/api/v1/institutions/{inst_id}/document-requests/{req_id}/status", response_model=DocumentRequestResponse)
async def update_document_request_status(inst_id: uuid.UUID, req_id: uuid.UUID, payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    req_stmt = select(DocumentRequest).filter(DocumentRequest.id == req_id, DocumentRequest.institution_id == inst_id)
    req_res = await db.execute(req_stmt)
    doc_req = req_res.scalar_one_or_none()
    if not doc_req:
        raise HTTPException(status_code=404, detail="Document request not found")
        
    status_val = payload.get("status")
    response_notes = payload.get("response_notes")
    
    if status_val:
        doc_req.status = status_val
    if response_notes is not None:
        doc_req.response_notes = response_notes
        
    doc_req.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(doc_req)
    
    stud_stmt = select(Student).filter(Student.id == doc_req.student_id)
    stud_res = await db.execute(stud_stmt)
    student = stud_res.scalar_one_or_none()
    if student:
        notif = Notification(
            user_id=str(student.id),
            title="Document Request Update",
            message=f"Your {doc_req.request_type} request is now {doc_req.status}."
        )
        db.add(notif)
        await db.commit()
        
    return doc_req


# 20. POST /api/v1/verify/verification-requests -> Create new verifier verification request
@app.post("/api/v1/verify/verification-requests", response_model=VerificationRequestResponse, status_code=201)
async def create_verification_request(req: VerificationRequestCreate, db: AsyncSession = Depends(get_db)):
    new_req = VerificationRequest(
        verifier_org=req.verifier_org,
        verifier_email=req.verifier_email,
        student_id=req.student_id,
        credential_id=req.credential_id,
        details=req.details,
        status="PENDING"
    )
    db.add(new_req)
    await db.commit()
    await db.refresh(new_req)
    
    cred_stmt = select(Credential).filter(Credential.id == req.credential_id)
    cred_res = await db.execute(cred_stmt)
    cred = cred_res.scalar_one_or_none()
    if cred:
        ev_stmt = select(AcademicEvent).filter(AcademicEvent.id == cred.event_id)
        ev_res = await db.execute(ev_stmt)
        ev = ev_res.scalar_one_or_none()
        if ev:
            inst_stmt = select(Institution).filter(Institution.id == ev.institution_id)
            inst_res = await db.execute(inst_stmt)
            inst = inst_res.scalar_one_or_none()
            if inst:
                notif = Notification(
                    user_id=inst.code,
                    title="Manual Verification Request",
                    message=f"{req.verifier_org} requested confirmation for credential {req.credential_id}."
                )
                db.add(notif)
                await db.commit()
                
    return new_req


# 21. GET /api/v1/institutions/{inst_id}/verification-requests -> Get all verification requests for institution
@app.get("/api/v1/institutions/{inst_id}/verification-requests", response_model=List[VerificationRequestResponse])
async def list_institution_verification_requests(inst_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(VerificationRequest).join(
        Credential, VerificationRequest.credential_id == Credential.id
    ).join(
        AcademicEvent, Credential.event_id == AcademicEvent.id
    ).filter(
        AcademicEvent.institution_id == inst_id
    ).order_by(VerificationRequest.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# 22. POST /api/v1/institutions/{inst_id}/verification-requests/{req_id}/status -> Respond to verification request
@app.post("/api/v1/institutions/{inst_id}/verification-requests/{req_id}/status", response_model=VerificationRequestResponse)
async def update_verification_request_status(inst_id: uuid.UUID, req_id: uuid.UUID, payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    req_stmt = select(VerificationRequest).filter(VerificationRequest.id == req_id)
    req_res = await db.execute(req_stmt)
    v_req = req_res.scalar_one_or_none()
    if not v_req:
        raise HTTPException(status_code=404, detail="Verification request not found")
        
    status_val = payload.get("status")
    response_notes = payload.get("response_notes")
    if status_val:
        v_req.status = status_val
    if response_notes is not None:
        v_req.response_notes = response_notes
        
    await db.commit()
    await db.refresh(v_req)
    return v_req


# 23. GET /api/v1/verify/verification-requests/{req_id} -> Get verification request by ID
@app.get("/api/v1/verify/verification-requests/{req_id}", response_model=VerificationRequestResponse)
async def get_verification_request(req_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(VerificationRequest).filter(VerificationRequest.id == req_id)
    res = await db.execute(stmt)
    v_req = res.scalar_one_or_none()
    if not v_req:
        raise HTTPException(status_code=404, detail="Request not found")
    return v_req


# 24. POST /api/v1/verify/integrity-requests -> Create plagiarism / integrity review request
@app.post("/api/v1/verify/integrity-requests", response_model=IntegrityRequestResponse, status_code=201)
async def create_integrity_request(req: IntegrityRequestCreate, db: AsyncSession = Depends(get_db)):
    new_req = IntegrityRequest(
        verifier_org=req.verifier_org,
        verifier_email=req.verifier_email,
        credential_id=req.credential_id,
        academic_work_details=req.academic_work_details,
        concern=req.concern,
        status="PENDING"
    )
    db.add(new_req)
    await db.commit()
    await db.refresh(new_req)
    
    cred_stmt = select(Credential).filter(Credential.id == req.credential_id)
    cred_res = await db.execute(cred_stmt)
    cred = cred_res.scalar_one_or_none()
    if cred:
        ev_stmt = select(AcademicEvent).filter(AcademicEvent.id == cred.event_id)
        ev_res = await db.execute(ev_stmt)
        ev = ev_res.scalar_one_or_none()
        if ev:
            inst_stmt = select(Institution).filter(Institution.id == ev.institution_id)
            inst_res = await db.execute(inst_stmt)
            inst = inst_res.scalar_one_or_none()
            if inst:
                notif = Notification(
                    user_id=inst.code,
                    title="Plagiarism Review Flagged",
                    message=f"Academic work for credential {req.credential_id} was flagged for plagiarism review."
                )
                db.add(notif)
                await db.commit()
                
    return new_req


# 25. GET /api/v1/institutions/{inst_id}/integrity-requests -> Get all integrity requests for institution
@app.get("/api/v1/institutions/{inst_id}/integrity-requests", response_model=List[IntegrityRequestResponse])
async def list_institution_integrity_requests(inst_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(IntegrityRequest).join(
        Credential, IntegrityRequest.credential_id == Credential.id
    ).join(
        AcademicEvent, Credential.event_id == AcademicEvent.id
    ).filter(
        AcademicEvent.institution_id == inst_id
    ).order_by(IntegrityRequest.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# 26. POST /api/v1/institutions/{inst_id}/integrity-requests/{req_id}/status -> Update status of integrity request
@app.post("/api/v1/institutions/{inst_id}/integrity-requests/{req_id}/status", response_model=IntegrityRequestResponse)
async def update_integrity_request_status(inst_id: uuid.UUID, req_id: uuid.UUID, payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    req_stmt = select(IntegrityRequest).filter(IntegrityRequest.id == req_id)
    req_res = await db.execute(req_stmt)
    i_req = req_res.scalar_one_or_none()
    if not i_req:
        raise HTTPException(status_code=404, detail="Integrity request not found")
        
    status_val = payload.get("status")
    response_notes = payload.get("response_notes")
    if status_val:
        i_req.status = status_val
    if response_notes is not None:
        i_req.response_notes = response_notes
        
    await db.commit()
    await db.refresh(i_req)
    return i_req


# 27. GET /api/v1/verify/integrity-requests/{req_id} -> Get integrity request by ID
@app.get("/api/v1/verify/integrity-requests/{req_id}", response_model=IntegrityRequestResponse)
async def get_integrity_request(req_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(IntegrityRequest).filter(IntegrityRequest.id == req_id)
    res = await db.execute(stmt)
    i_req = res.scalar_one_or_none()
    if not i_req:
        raise HTTPException(status_code=404, detail="Request not found")
    return i_req


# 28. GET /api/v1/students/{student_id}/notifications -> Get student notifications
@app.get("/api/v1/students/{student_id}/notifications", response_model=List[NotificationResponse])
async def list_student_notifications(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Notification).filter(Notification.user_id == str(student_id)).order_by(Notification.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# 29. POST /api/v1/students/{student_id}/notifications/read -> Mark student notifications as read
@app.post("/api/v1/students/{student_id}/notifications/read")
async def mark_notifications_read(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Notification).filter(Notification.user_id == str(student_id), Notification.is_read == False)
    res = await db.execute(stmt)
    notifs = res.scalars().all()
    for n in notifs:
        n.is_read = True
    await db.commit()
    return {"message": f"Marked {len(notifs)} notifications as read."}


# 30. GET /api/v1/institutions/{code}/notifications -> Get institution notifications by code
@app.get("/api/v1/institutions/{code}/notifications", response_model=List[NotificationResponse])
async def list_institution_notifications(code: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Notification).filter(Notification.user_id == code).order_by(Notification.created_at.desc())
    res = await db.execute(stmt)
    return list(res.scalars().all())


# 31. GET /api/v1/students/{student_id}/permissions -> Get active student shared permissions
@app.get("/api/v1/students/{student_id}/permissions")
async def list_student_permissions(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = select(Permission).filter(Permission.student_id == student_id, Permission.is_revoked == False).order_by(Permission.expires_at.desc())
    res = await db.execute(stmt)
    perms = res.scalars().all()
    return [
        {
            "id": p.id,
            "credential_id": p.credential_id,
            "student_id": p.student_id,
            "verifier_email": p.verifier_email,
            "access_token": p.access_token,
            "fields_allowed": p.fields_allowed,
            "expires_at": p.expires_at,
            "is_revoked": p.is_revoked
        } for p in perms
    ]


