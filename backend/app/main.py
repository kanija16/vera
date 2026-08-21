import time
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import engine, get_db, AsyncSessionLocal
from app.models import Base, Institution, Student, AcademicEvent, Credential, Permission, AuditLog, EventType, EventStatus, CredentialStatus
from app.schemas import EventCreate, EventResponse, FinalizeResponse, StudentCredentialsResponse, CredentialResponseItem, ShareRequest, ShareResponse, VerifyResponse, TamperSimulateRequest, RevokeResponse
from app.services.crypto import build_merkle_tree, generate_hmac_token, verify_hmac_token, verify_merkle_proof, canonicalize_json
from app.services.validator import ConsistencyAnomalyEngine, seed_emily_white
from app.services.blockchain import BlockchainLedgerSimulator

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
    async with engine.begin() as conn:
        # Create all tables asynchronously
        await conn.run_sync(Base.metadata.create_all)
    
    # Pre-seed Emily White records
    async with AsyncSessionLocal() as session:
        try:
            await seed_emily_white(session)
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


# 1. POST /api/v1/institutions/{inst_id}/events -> Ingest event
@app.post("/api/v1/institutions/{inst_id}/events", response_model=EventResponse, status_code=201)
async def ingest_event(inst_id: uuid.UUID, event_in: EventCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verify Institution exists
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    # 2. Verify Student exists
    stud_stmt = select(Student).filter(Student.id == event_in.student_id)
    stud_res = await db.execute(stud_stmt)
    student = stud_res.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # 3. Process Validation
    validator = ConsistencyAnomalyEngine(db)
    event_date = event_in.event_date or datetime.utcnow()
    
    status_res, trust_score, errors = await validator.evaluate_event(
        institution_id=str(inst_id),
        student_id=str(event_in.student_id),
        event_type=event_in.event_type,
        payload=event_in.payload,
        event_date=event_date
    )
    
    # 4. Save Event
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
    
    # 5. Write Audit Log
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


# 2. POST /api/v1/institutions/{inst_id}/events/{event_id}/finalize -> Finalize & Anchor
@app.post("/api/v1/institutions/{inst_id}/events/{event_id}/finalize", response_model=FinalizeResponse)
async def finalize_event(inst_id: uuid.UUID, event_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    # Verify Institution
    inst_stmt = select(Institution).filter(Institution.id == inst_id)
    inst_res = await db.execute(inst_stmt)
    inst = inst_res.scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    # Verify Event
    event_stmt = select(AcademicEvent).filter(
        AcademicEvent.id == event_id,
        AcademicEvent.institution_id == inst_id
    )
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Academic event not found")
        
    # Guard: Must be VALID status (Item 1 & 4 in spec)
    if event.status != EventStatus.VALID.value:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot finalize event: status is '{event.status}'. Must be 'VALID'."
        )
        
    # Check if already finalized
    existing_cred_stmt = select(Credential).filter(Credential.event_id == event_id)
    existing_cred_res = await db.execute(existing_cred_stmt)
    if existing_cred_res.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Event already finalized and anchored.")
        
    # 1. Canonicalization
    canonical_payload_bytes = canonicalize_json(event.payload)
    canonical_hash = hashlib.sha256(canonical_payload_bytes).hexdigest()
    
    # 2. Construct Merkle tree from fields
    leaf_hashes, merkle_root = build_merkle_tree(event.payload)
    
    # 3. Anchor to thread-safe blockchain ledger simulator
    ledger_record = BlockchainLedgerSimulator.anchor_credential(
        credential_id=str(event_id), # Map credential ID to event ID
        merkle_root=merkle_root,
        institution_id=str(inst_id)
    )
    
    # 4. Save Credential
    credential = Credential(
        id=event_id, # Matching ID for simplicity
        event_id=event_id,
        student_id=event.student_id,
        merkle_root=merkle_root,
        canonical_payload_hash=canonical_hash,
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


# 3. GET /api/v1/students/{student_id}/credentials -> List student credentials
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


# 4. POST /api/v1/credentials/{cred_id}/share -> Create time-bounded token
@app.post("/api/v1/credentials/{cred_id}/share", response_model=ShareResponse)
async def share_credential(cred_id: uuid.UUID, share_in: ShareRequest, db: AsyncSession = Depends(get_db)):
    cred_stmt = select(Credential).filter(Credential.id == cred_id)
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    # Verify ACTIVE status before sharing
    if credential.status != CredentialStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Cannot share inactive or revoked credential.")
        
    # Generate expiry timestamp
    expires_at_timestamp = time.time() + share_in.expires_in_seconds
    expires_at_datetime = datetime.utcfromtimestamp(expires_at_timestamp).replace(tzinfo=timezone.utc)
    
    # Generate cryptographically verifiable HMAC-SHA256 token
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
        details={"verifier_email": share_in.verifier_email, "expires_at": expires_at_datetime.isoformat()}
    )
    
    return ShareResponse(
        permission_id=permission.id,
        access_token=token,
        expires_at=expires_at_datetime
    )


# 5. GET /api/v1/verify/{access_token} -> Cryptographically verify token & record
@app.get("/api/v1/verify/{access_token}", response_model=VerifyResponse)
async def verify_credential_pass(access_token: str, db: AsyncSession = Depends(get_db)):
    # 1. Cryptographically verify the HMAC token first (offline validator)
    is_valid_token, token_payload = verify_hmac_token(access_token)
    if not is_valid_token:
        raise HTTPException(
            status_code=401,
            detail="Verification failed: Access token is invalid, tampered, or expired."
        )
        
    cred_id = token_payload["credential_id"]
    student_id = token_payload["student_id"]
    
    # 2. Fetch permission record from database to verify if manually revoked by student
    perm_stmt = select(Permission).filter(Permission.access_token == access_token)
    perm_res = await db.execute(perm_stmt)
    permission = perm_res.scalar_one_or_none()
    if not permission or permission.is_revoked:
        raise HTTPException(status_code=401, detail="Verification failed: Permission revoked by student.")
        
    # 3. Retrieve database records (Off-chain)
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
    
    # 4. Fetch On-chain Status (Separating PII!)
    onchain = BlockchainLedgerSimulator.get_credential(cred_id)
    if not onchain:
        raise HTTPException(status_code=404, detail="No on-chain anchor found for this credential.")
        
    onchain_status = onchain["status"]
    
    # 5. Core Verification Step: Recompute Root Hash from off-chain payload
    # This prevents undetected database manipulations
    _, recomputed_root = build_merkle_tree(event.payload)
    
    # 6. Execute checks
    checks = {
        "HMAC Access Token Cryptographically Valid": True,
        "Off-Chain Payload Match On-Chain Merkle Root": (recomputed_root == onchain["merkle_root"]),
        "On-Chain Credential Status Active": (onchain_status == "ACTIVE")
    }
    
    # Determine result state
    if not checks["Off-Chain Payload Match On-Chain Merkle Root"]:
        # Hash mismatch -> DATABASE TAMPERING DETECTED!
        # Return 409 Conflict according to specification
        raise HTTPException(
            status_code=409,
            detail="TAMPERING_DETECTED: Off-chain record hashes do not match the immutable on-chain Merkle Root."
        )
        
    if not checks["On-Chain Credential Status Active"]:
        verification_status = "REVOKED"
    else:
        verification_status = "AUTHENTIC"
        
    # Log the verification event
    await log_audit_async(
        db,
        actor_id=token_payload["verifier_email"],
        action="VERIFY_CREDENTIAL_TOKEN",
        target_id=cred_id,
        details={"result": verification_status, "checks": checks}
    )
    
    return VerifyResponse(
        status=verification_status,
        student_name=student.name,
        matriculation_no=student.matriculation_no,
        issuer_name=inst.name,
        issuer_code=inst.code,
        credential_id=credential.id,
        event_type=event.event_type,
        payload=event.payload,
        merkle_root=onchain["merkle_root"],
        onchain_status=onchain_status,
        checks=checks
    )


# 6. POST /api/v1/verify/tamper-simulate -> Modify off-chain field directly (Demo)
@app.post("/api/v1/verify/tamper-simulate")
async def simulate_tamper(req: TamperSimulateRequest, db: AsyncSession = Depends(get_db)):
    cred_stmt = select(Credential).filter(Credential.id == req.credential_id)
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    event_stmt = select(AcademicEvent).filter(AcademicEvent.id == credential.event_id)
    event_res = await db.execute(event_stmt)
    event = event_res.scalar_one_or_none()
    
    # Directly mutate the JSONB payload in PostgreSQL (simulates malicious DB admin alteration)
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
    
    return {"message": f"Off-chain event payload successfully tampered with: '{req.field_name}' set to '{req.new_value}'."}


# 7. POST /api/v1/credentials/{cred_id}/revoke -> Revoke credential on-chain
@app.post("/api/v1/credentials/{cred_id}/revoke", response_model=RevokeResponse)
async def revoke_credential(cred_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    cred_stmt = select(Credential).filter(Credential.id == cred_id)
    cred_res = await db.execute(cred_stmt)
    credential = cred_res.scalar_one_or_none()
    if not credential:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    if credential.status == CredentialStatus.REVOKED.value:
        raise HTTPException(status_code=400, detail="Credential is already revoked.")
        
    # Mark as revoked on the simulated blockchain smart contract ledger
    success = BlockchainLedgerSimulator.update_status(str(cred_id), "REVOKED")
    if not success:
        raise HTTPException(status_code=404, detail="Credential not found on simulated blockchain ledger")
        
    # Also update DB status
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
