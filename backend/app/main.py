import os
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, get_db, SessionLocal
from app.models import Base, Institution, Student, AcademicEvent, Credential, Permission, VerificationEvent, AuditEvent, CredentialRelationship
from app.schemas import AcademicEventCreate, CredentialRevokeRequest, SharePassCreate, SharePassResponse, TamperRequest, TokenVerificationResponse
from app.merkle import MerkleTreeEngine
from app.crypto import sign_hash, verify_signature
from app.consistency import AcademicConsistencyEngine
from app.blockchain import BlockchainAttestor

app = FastAPI(title="VERA Academic Trust API", version="1.0.0")

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In hackathon allow all, easy frontend connect
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB initialization & auto-seeding
@app.on_event("startup")
def startup_db_init():
    print("Connecting database and ensuring tables exist...")
    Base.metadata.create_all(bind=engine)
    # Trigger seed if empty
    db = SessionLocal()
    try:
        if db.query(Institution).first() is None:
            print("Database empty. Auto-seeding default demo records...")
            from app.seed import seed_db
            seed_db()
    except Exception as e:
        print(f"Error seeding on startup: {e}")
    finally:
        db.close()


# Helper to log audit events
def log_audit(db: Session, actor: str, action: str, object_id: str = None):
    audit = AuditEvent(
        actor=actor,
        action=action,
        object_id=object_id,
        timestamp=datetime.utcnow()
    )
    db.add(audit)
    db.commit()


# 1. POST /api/institutions/{id}/events - Log academic event
@app.post("/api/institutions/{inst_id}/events", status_code=201)
def log_academic_event(inst_id: str, event_in: AcademicEventCreate, db: Session = Depends(get_db)):
    # Verify institution exists
    inst = db.query(Institution).filter(Institution.institution_id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    # Verify student exists
    student = db.query(Student).filter(Student.student_id == event_in.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Create the event
    event = AcademicEvent(
        student_id=event_in.student_id,
        institution_id=inst_id,
        event_type=event_in.event_type,
        payload=event_in.payload,
        event_date=event_in.event_date.replace(tzinfo=None), # Naive comparison
        triggered_issuance=False
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    log_audit(db, actor=inst.name, action=f"Logged Event: {event_in.event_type}", object_id=event.event_id)
    return {"message": "Event logged successfully", "event_id": event.event_id}


# 2. POST /api/institutions/{id}/events/{event_id}/finalize - Batch auto-issuance trigger
@app.post("/api/institutions/{inst_id}/events/{event_id}/finalize")
def finalize_event_and_issue(inst_id: str, event_id: str, db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.institution_id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    # Mandatory Check: Fake/unverified institutions cannot issue credentials
    if inst.status != "VERIFIED":
        raise HTTPException(
            status_code=403, 
            detail=f"Unauthorized: Institution status is {inst.status}. Only VERIFIED institutions can finalize credentials."
        )
        
    event = db.query(AcademicEvent).filter(
        AcademicEvent.event_id == event_id, 
        AcademicEvent.institution_id == inst_id
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Academic event not found")
        
    if event.triggered_issuance:
        raise HTTPException(status_code=400, detail="Event already finalized and credential issued")
        
    # Map event type to credential type
    cred_type_map = {
        "admission": "transcript",
        "semester_lock": "transcript",
        "convocation": "degree",
        "migration": "migration_certificate"
    }
    
    cred_type = cred_type_map.get(event.event_type)
    if not cred_type:
        raise HTTPException(status_code=400, detail=f"Unsupported event type for issuance: {event.event_type}")
        
    # Retrieve student details
    student = db.query(Student).filter(Student.student_id == event.student_id).first()
    
    # Construct core credential fields
    cred_fields = {
        "student_name": student.full_name,
        "roll_number": student.identity_ref or "N/A",
        "credential_type": cred_type,
        "issuance_date": datetime.utcnow().date().isoformat()
    }
    # Add payload specific items
    for k, v in event.payload.items():
        cred_fields[k] = str(v)
        
    # Consistency check check BEFORE anchoring
    consistency_engine = AcademicConsistencyEngine(db)
    # Evaluate new credential
    new_cred_eval = {
        "type": cred_type,
        "issuanceDate": datetime.utcnow().isoformat()
    }
    is_consistent, errors = consistency_engine.evaluate_new_credential(str(student.student_id), new_cred_eval)
    if not is_consistent:
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Academic Consistency check failed. Issuance blocked.",
                "errors": errors
            }
        )
        
    # Build Merkle tree & generate salts
    salts = {k: secrets.token_hex(16) for k in cred_fields.keys()}
    merkle_tree = MerkleTreeEngine(cred_fields, salts)
    merkle_root = merkle_tree.get_root().hex()
    
    # Smart contract / Blockchain anchor
    tx_hash = BlockchainAttestor.anchor_credential(
        credential_id=event_id, # Link it to event uuid as credential uuid
        merkle_root=merkle_root,
        institution_wallet=inst.wallet_address
    )
    
    # Save the credential
    credential = Credential(
        credential_id=event_id, # Match credential ID with source event ID for simplicity
        student_id=student.student_id,
        institution_id=inst.institution_id,
        credential_type=cred_type,
        fields=cred_fields,
        salts=salts,
        merkle_root=merkle_root,
        onchain_tx_hash=tx_hash,
        issued_at=datetime.utcnow(),
        status="active",
        source_event_id=event.event_id
    )
    
    event.triggered_issuance = True
    event.finalized_at = datetime.utcnow()
    
    db.add(credential)
    db.commit()
    
    log_audit(db, actor=inst.name, action=f"Issued Credential ({cred_type})", object_id=credential.credential_id)
    return {
        "message": f"Credential ({cred_type}) issued successfully",
        "credential_id": credential.credential_id,
        "merkle_root": merkle_root,
        "onchain_tx_hash": tx_hash
    }


# 3. POST /api/credentials/{id}/revoke - Revoke a credential
@app.post("/api/credentials/{cred_id}/revoke")
def revoke_credential(cred_id: str, req: CredentialRevokeRequest, db: Session = Depends(get_db)):
    cred = db.query(Credential).filter(Credential.credential_id == cred_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    if cred.status == "revoked":
        raise HTTPException(status_code=400, detail="Credential is already revoked")
        
    inst = db.query(Institution).filter(Institution.institution_id == cred.institution_id).first()
    
    # Submit on-chain revocation transaction
    tx_hash = BlockchainAttestor.revoke_credential(
        credential_id=cred_id,
        institution_wallet=inst.wallet_address,
        reason=req.reason
    )
    
    cred.status = "revoked"
    db.commit()
    
    log_audit(db, actor=inst.name, action=f"Revoked Credential: {req.reason}", object_id=cred_id)
    return {"message": "Credential revoked successfully", "tx_hash": tx_hash}


# 4. GET /api/students/{id}/credentials - Passport view
@app.get("/api/students/{student_id}/credentials")
def get_student_credentials(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    creds = db.query(Credential).filter(Credential.student_id == student_id).all()
    
    # Generate list of credentials with simple status indicator
    result = []
    for c in creds:
        # Run local consistency check to show dynamic warning
        consistency_engine = AcademicConsistencyEngine(db)
        eval_dict = {
            "type": c.credential_type,
            "issuanceDate": c.issued_at.isoformat()
        }
        # Run check
        is_consistent, errors = consistency_engine.evaluate_new_credential(student_id, eval_dict)
        
        # Override status to 'review' if inconsistent (but not revoked)
        current_status = c.status
        if current_status == "active" and not is_consistent:
            current_status = "review"
            
        result.append({
            "credential_id": c.credential_id,
            "credential_type": c.credential_type,
            "issued_at": c.issued_at.isoformat(),
            "status": current_status,
            "merkle_root": c.merkle_root,
            "onchain_tx_hash": c.onchain_tx_hash,
            "fields": c.fields
        })
        
    return {
        "student": {
            "student_id": student.student_id,
            "full_name": student.full_name,
            "identity_ref": student.identity_ref,
            "wallet_address": student.wallet_address
        },
        "credentials": result
    }


# 5. POST /api/credentials/{id}/share - Create selective disclosure pass
@app.post("/api/credentials/{cred_id}/share", response_model=SharePassResponse)
def share_credential(cred_id: str, share_in: SharePassCreate, db: Session = Depends(get_db)):
    cred = db.query(Credential).filter(Credential.credential_id == cred_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    # Calculate duration
    duration_map = {
        "1h": timedelta(hours=1),
        "24h": timedelta(days=1),
        "7d": timedelta(days=7),
        "forever": timedelta(days=3650) # ~10 years
    }
    delta = duration_map.get(share_in.duration, timedelta(days=1))
    expires_at = datetime.utcnow() + delta
    
    # Generate unique URL-safe verification token
    token = secrets.token_urlsafe(24)
    
    permission = Permission(
        credential_id=cred_id,
        verifier_label=share_in.verifier_label,
        fields_allowed=share_in.fields_allowed,
        verification_pass_token=token,
        expires_at=expires_at
    )
    db.add(permission)
    db.commit()
    db.refresh(permission)
    
    qr_payload = f"http://localhost:3000/verify/{token}"
    
    student = db.query(Student).filter(Student.student_id == cred.student_id).first()
    log_audit(db, actor=student.full_name, action=f"Created share pass for {share_in.verifier_label}", object_id=cred_id)
    
    return SharePassResponse(
        permission_id=permission.permission_id,
        token=token,
        qr_payload=qr_payload,
        expires_at=expires_at.isoformat() + "Z"
    )


# 6. GET /api/verify/{token} - Public verifier portal verification endpoint
@app.get("/api/verify/{token}")
def verify_token(token: str, db: Session = Depends(get_db)):
    # 1. Fetch permission pass
    permission = db.query(Permission).filter(Permission.verification_pass_token == token).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Verification pass not found")
        
    cred = db.query(Credential).filter(Credential.credential_id == permission.credential_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential associated with pass not found")
        
    student = db.query(Student).filter(Student.student_id == cred.student_id).first()
    inst = db.query(Institution).filter(Institution.institution_id == cred.institution_id).first()
    
    # Execute checks in strict order:
    layered_checks = {}
    
    # (1) Permission validity (not expired or student revoked)
    is_expired = datetime.utcnow() > permission.expires_at
    is_revoked = permission.revoked_at is not None
    layered_checks["permission_valid"] = not (is_expired or is_revoked)
    
    # (2) On-chain status active
    # Query smart contract state on-chain
    onchain = BlockchainAttestor.get_onchain_status(cred.credential_id)
    # Check if active and match root
    onchain_active = onchain.get("active", True)
    layered_checks["onchain_status_active"] = onchain_active and (cred.status == "active")
    
    # (3) Merkle proof recomputation per disclosed field
    # We construct a simulated proof disclosure payload.
    # For the verifier, we only show disclosed fields + their proofs
    disclosed_fields = {}
    merkle_proofs = {}
    proof_verification_success = True
    
    # Instantiate the Merkle engine on full fields to generate proofs
    full_merkle = MerkleTreeEngine(cred.fields, cred.salts)
    
    # Iterate permitted fields
    for field in permission.fields_allowed:
        if field in cred.fields:
            val = cred.fields[field]
            salt = cred.salts[field]
            proof = full_merkle.generate_proof(field)
            
            disclosed_fields[field] = val
            merkle_proofs[field] = {
                "value": val,
                "salt": salt,
                "proof": proof
            }
            
            # Verify the proof locally
            local_verify = MerkleTreeEngine.verify_proof(
                target_key=field,
                target_value=val,
                salt=salt,
                proof=proof,
                root=bytes.fromhex(cred.merkle_root)
            )
            if not local_verify:
                proof_verification_success = False
                
    layered_checks["merkle_proof_valid"] = proof_verification_success
    
    # (4) Student identity linkage (check student is valid in DB)
    layered_checks["student_identity_linked"] = student is not None
    
    # (5) Consistency Engine Rule 1 check
    consistency_engine = AcademicConsistencyEngine(db)
    eval_dict = {
        "type": cred.credential_type,
        "issuanceDate": cred.issued_at.isoformat()
    }
    is_consistent, consistency_errors = consistency_engine.evaluate_new_credential(student.student_id, eval_dict)
    layered_checks["academic_consistency_valid"] = is_consistent
    
    # (6) Final aggregate state calculation
    final_result = "verified"
    
    # Order of priority: Revoked -> Tampered -> Review -> Verified
    if not layered_checks["permission_valid"]:
        final_result = "expired"
    elif not layered_checks["onchain_status_active"]:
        final_result = "revoked"
    elif not layered_checks["merkle_proof_valid"]:
        final_result = "tampered"
    elif not layered_checks["academic_consistency_valid"]:
        final_result = "review"
        
    # Log the verification event
    v_event = VerificationEvent(
        credential_id=cred.credential_id,
        permission_id=permission.permission_id,
        result=final_result,
        checked_at=datetime.utcnow()
    )
    db.add(v_event)
    db.commit()
    
    return {
        "result": final_result,
        "verifier_label": permission.verifier_label,
        "expires_at": permission.expires_at.isoformat() + "Z",
        "student_name": student.full_name,
        "institution_name": inst.name,
        "credential_type": cred.credential_type,
        "disclosed_fields": disclosed_fields,
        "merkle_proofs": merkle_proofs,
        "merkle_root": cred.merkle_root,
        "onchain_tx_hash": cred.onchain_tx_hash,
        "layered_checks": {
            "Permission Not Expired/Revoked": layered_checks["permission_valid"],
            "On-Chain Credential Status Active": layered_checks["onchain_status_active"],
            "Merkle Proof Integrity Valid": layered_checks["merkle_proof_valid"],
            "Student Identity Matching": layered_checks["student_identity_linked"],
            "Timeline Consistency Checked": layered_checks["academic_consistency_valid"]
        },
        "consistency_errors": consistency_errors if not is_consistent else []
    }


# 7. POST /api/verify/tamper-simulate - Demo-only: mutate a field in database
@app.post("/api/verify/tamper-simulate")
def simulate_tamper(req: TamperRequest, db: Session = Depends(get_db)):
    cred = db.query(Credential).filter(Credential.credential_id == req.credential_id).first()
    if not cred:
        raise HTTPException(status_code=404, detail="Credential not found")
        
    if req.field_to_tamper not in cred.fields:
        raise HTTPException(status_code=400, detail=f"Field '{req.field_to_tamper}' not found in credential payload")
        
    # Mutate the field in database
    updated_fields = dict(cred.fields)
    updated_fields[req.field_to_tamper] = req.new_value
    cred.fields = updated_fields
    db.commit()
    
    log_audit(db, actor="Demo Admin", action=f"Mutated field {req.field_to_tamper} in database", object_id=req.credential_id)
    return {"message": f"Successfully tampered with field '{req.field_to_tamper}' in database. Re-run verification to see TAMPERED state."}


# 8. DELETE /api/permissions/{id} - Student revokes a share pass
@app.delete("/api/permissions/{permission_id}")
def revoke_share_pass(permission_id: str, db: Session = Depends(get_db)):
    permission = db.query(Permission).filter(Permission.permission_id == permission_id).first()
    if not permission:
        raise HTTPException(status_code=404, detail="Permission pass not found")
        
    if permission.revoked_at is not None:
        return {"message": "Permission already revoked"}
        
    permission.revoked_at = datetime.utcnow()
    db.commit()
    
    cred = db.query(Credential).filter(Credential.credential_id == permission.credential_id).first()
    student = db.query(Student).filter(Student.student_id == cred.student_id).first()
    
    log_audit(db, actor=student.full_name, action=f"Revoked verifier share pass", object_id=permission.permission_id)
    return {"message": "Share pass revoked successfully"}


# 9. GET /api/students/{id}/access-history - Student access history timeline
@app.get("/api/students/{student_id}/access-history")
def get_access_history(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    # Query permissions and their verification events
    history = db.query(VerificationEvent, Permission, Credential)\
        .join(Permission, VerificationEvent.permission_id == Permission.permission_id)\
        .join(Credential, Permission.credential_id == Credential.credential_id)\
        .filter(Credential.student_id == student_id)\
        .order_by(VerificationEvent.checked_at.desc())\
        .all()
        
    result = []
    for ve, p, c in history:
        result.append({
            "event_time": ve.checked_at.isoformat(),
            "verifier_label": p.verifier_label,
            "credential_type": c.credential_type,
            "disclosed_fields_count": len(p.fields_allowed),
            "result": ve.result
        })
        
    return {
        "student_id": student_id,
        "access_logs": result
    }


# 10. GET /api/institutions/{id}/audit-trail - Institutional audit log
@app.get("/api/institutions/{inst_id}/audit-trail")
def get_audit_trail(inst_id: str, db: Session = Depends(get_db)):
    # Verify institution exists
    inst = db.query(Institution).filter(Institution.institution_id == inst_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution not found")
        
    # Query audit events
    events = db.query(AuditEvent).order_by(AuditEvent.timestamp.desc()).all()
    
    result = []
    for e in events:
        result.append({
            "time": e.timestamp.isoformat(),
            "actor": e.actor,
            "action": e.action,
            "object_id": str(e.object_id) if e.object_id else None
        })
        
    return {
        "institution_id": inst_id,
        "institution_name": inst.name,
        "audit_logs": result
    }
