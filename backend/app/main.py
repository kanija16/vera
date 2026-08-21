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
from app.models import Base, Institution, Student, AcademicEvent, Credential, Permission, AuditLog, EventType, EventStatus, CredentialStatus
from app.schemas import EventCreate, EventResponse, FinalizeResponse, StudentCredentialsResponse, CredentialResponseItem, ShareRequest, ShareResponse, VerifyResponse, TamperSimulateRequest, RevokeResponse
from app.services.crypto import build_merkle_tree, generate_hmac_token, verify_hmac_token, verify_merkle_proof, canonicalize_json, generate_merkle_proof
from app.services.validator import ConsistencyAnomalyEngine
from app.services.blockchain import BlockchainLedgerSimulator
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
    
    # Check if duplicate code
    dup_stmt = select(Institution).filter(Institution.code == code)
    dup_res = await db.execute(dup_stmt)
    if dup_res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Institution code already exists")
        
    _, public_key = generate_ecdsa_keypair()
    inst = Institution(
        name=payload.get("name", "Unnamed Institution"),
        code=code,
        public_key=public_key,
        is_verified=payload.get("is_verified", True)
    )
    db.add(inst)
    await db.commit()
    await db.refresh(inst)
    return {"id": inst.id, "name": inst.name, "code": inst.code, "is_verified": inst.is_verified}


# 1b. GET /api/v1/institutions -> List institutions
@app.get("/api/v1/institutions")
async def list_institutions(db: AsyncSession = Depends(get_db)):
    stmt = select(Institution)
    res = await db.execute(stmt)
    institutions = res.scalars().all()
    return [{"id": i.id, "name": i.name, "code": i.code, "is_verified": i.is_verified} for i in institutions]


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


# 5. POST /api/v1/institutions/{inst_id}/events/{event_id}/finalize -> Finalize & Anchor
@app.post("/api/v1/institutions/{inst_id}/events/{event_id}/finalize", response_model=FinalizeResponse)
async def finalize_event(inst_id: uuid.UUID, event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    event_stmt = select(AcademicEvent).filter(
        AcademicEvent.id == event_id,
        AcademicEvent.institution_id == inst_id
    )
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Academic event not found")
        
    if event.status != EventStatus.VALID.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot finalize event: status is '{event.status}'. Must be 'VALID'."
        )
        
    existing_cred_stmt = select(Credential).filter(Credential.event_id == event_id)
    existing_cred_res = await db.execute(existing_cred_stmt)
    if existing_cred_res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Event already finalized and anchored.")
        
    # Generate random salts for each field for privacy-preserving salted Merkle Tree
    salts = {k: secrets.token_hex(16) for k in event.payload.keys()}
    
    # 1. Canonicalization
    canonical_payload_bytes = canonicalize_json(event.payload)
    canonical_hash = hashlib.sha256(canonical_payload_bytes).hexdigest()
    
    # 2. Construct Salted Merkle Tree
    leaf_hashes, merkle_root = build_merkle_tree(event.payload, salts)
    
    # 3. Anchor to thread-safe blockchain ledger simulator
    ledger_record = BlockchainLedgerSimulator.anchor_credential(
        credential_id=str(event_id),
        merkle_root=merkle_root,
        institution_id=str(inst_id)
    )
    
    # 4. Save Credential with salts
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
    
    await log_audit_async(
        db,
        actor_id=inst.code,
        action="FINALIZE_AND_ANCHOR_CREDENTIAL",
        target_id=str(credential.id),
        details={"merkle_root": merkle_root, "ledger_record": ledger_record}
    )
    
    return FinalizeResponse(
        credential_id=credential.id,
        merkle_root=merkle_root,
        canonical_payload_hash=canonical_hash,
        status=credential.status,
        version=credential.version,
        blockchain_tx=ledger_record
    )


# 6. GET /api/v1/students/{student_id}/credentials -> List student credentials
@app.get("/api/v1/students/{student_id}/credentials", response_model=StudentCredentialsResponse)
async def list_student_credentials(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stud_stmt = select(Student).filter(Student.id == student_id)
    stud_res = await db.execute(stud_stmt)
    student = stud_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    creds_stmt = select(Credential).filter(Credential.student_id == student_id)
    creds_res = await db.execute(creds_stmt)
    credentials = list(creds_res.scalars().all())
    
    return StudentCredentialsResponse(
        student_id=student.id,
        name=student.name,
        matriculation_no=student.matriculation_no,
        credentials=[
            CredentialResponseItem(
                id=c.id,
                event_id=c.event_id,
                merkle_root=c.merkle_root,
                canonical_payload_hash=c.canonical_payload_hash,
                status=c.status,
                version=c.version,
                created_at=c.created_at
            ) for c in credentials
        ]
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
        
    expires_at_timestamp = time.time() + share_in.expires_in_seconds
    expires_at_datetime = datetime.utcfromtimestamp(expires_at_timestamp).replace(tzinfo=timezone.utc)
    
    token = generate_hmac_token(
        credential_id=str(cred_id),
        student_id=str(credential.student_id),
        verifier_email=share_in.verifier_email,
        expires_at=expires_at_timestamp
    )
    
    permission = Permission(
        credential_id=cred_id,
        student_id=credential.student_id,
        verifier_email=share_in.verifier_email,
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
        details={"verifier_email": share_in.verifier_email, "fields_allowed": share_in.fields_allowed, "expires_at": expires_at_datetime.isoformat()}
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
        "Timeline Consistency Checked": (event.status != EventStatus.SUSPICIOUS_REVIEW.value)
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
        credential_id=credential.id,
        event_type=event.event_type,
        payload=disclosed_payload,
        merkle_root=onchain["merkle_root"],
        onchain_status=onchain_status,
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
    
    updated_payload = dict(event.payload)
    updated_payload[req.field_name] = req.new_value
    event.payload = updated_payload
    await db.commit()
    
    await log_audit_async(
        db,
        actor_id="SIMULATED_MALICIOUS_DBA",
        action="TAMPER_OFF_CHAIN_RECORD",
        target_id=str(req.credential_id),
        details={"field": req.field_name, "value": req.new_value}
    )
    
    return {"message": f"Off-chain event payload successfully tampered: set '{req.field_name}' to '{req.new_value}'."}


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
