from pydantic import BaseModel, Field, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID

# Ingest event schemas
class EventCreate(BaseModel):
    student_id: UUID
    event_type: str = Field(..., description="Must be one of: ENROLLMENT, SEMESTER_FINAL, DEGREE_AWARD, MIGRATION_REQ")
    payload: Dict[str, Any]
    event_date: Optional[datetime] = None

class EventResponse(BaseModel):
    id: UUID
    institution_id: UUID
    student_id: UUID
    event_type: str
    status: str
    trust_score: float
    errors: List[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Finalize response schemas
class FinalizeResponse(BaseModel):
    credential_id: UUID
    merkle_root: str
    canonical_payload_hash: str
    status: str
    version: int
    blockchain_tx: Dict[str, Any]

# Student credential list schemas
class CredentialResponseItem(BaseModel):
    id: UUID
    event_id: UUID
    merkle_root: str
    canonical_payload_hash: str
    status: str
    version: int
    created_at: datetime

    class Config:
        from_attributes = True

class StudentCredentialsResponse(BaseModel):
    student_id: UUID
    name: str
    matriculation_no: str
    credentials: List[CredentialResponseItem]

# Share permission schemas
class ShareRequest(BaseModel):
    verifier_email: EmailStr
    expires_in_seconds: int = Field(86400, ge=60, description="Duration of token validity in seconds")

class ShareResponse(BaseModel):
    permission_id: UUID
    access_token: str
    expires_at: datetime

# Verification schemas
class VerifyResponse(BaseModel):
    status: str  # 'AUTHENTIC' | 'REVOKED' | 'TAMPERING_DETECTED'
    student_name: str
    matriculation_no: str
    issuer_name: str
    issuer_code: str
    credential_id: UUID
    event_type: str
    payload: Dict[str, Any]
    merkle_root: str
    onchain_status: str
    checks: Dict[str, bool]

# Tamper simulation schemas
class TamperSimulateRequest(BaseModel):
    credential_id: UUID
    field_name: str
    new_value: str

# Revocation schemas
class RevokeResponse(BaseModel):
    credential_id: UUID
    status: str
    message: str
