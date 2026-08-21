from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class AcademicEventCreate(BaseModel):
    student_id: str
    event_type: str  # 'admission' | 'semester_lock' | 'convocation' | 'migration'
    payload: Dict[str, Any]
    event_date: datetime

class CredentialRevokeRequest(BaseModel):
    reason: str

class SharePassCreate(BaseModel):
    verifier_label: Optional[str] = "Verifier"
    fields_allowed: List[str]
    duration: str  # '1h' | '24h' | '7d' | 'forever'

class SharePassResponse(BaseModel):
    permission_id: str
    token: str
    qr_payload: str
    expires_at: str

class TamperRequest(BaseModel):
    credential_id: str
    field_to_tamper: str
    new_value: str

class TokenVerificationResponse(BaseModel):
    result: str  # 'verified' | 'review' | 'tampered' | 'revoked'
    disclosed_fields: Dict[str, Any]
    layered_checks: Dict[str, Any]
