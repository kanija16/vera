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

# Governance schemas
class ProposeRequest(BaseModel):
    clerk_id: UUID

class ProposeResponse(BaseModel):
    event_id: UUID
    clerk_id: UUID
    clerk_signature: str
    status: str

class ApproveRequest(BaseModel):
    exam_officer_id: UUID

class ApproveResponse(BaseModel):
    credential_id: UUID
    exam_officer_id: UUID
    exam_officer_signature: str
    merkle_root: str
    status: str

class BatchAnchorResponse(BaseModel):
    batch_id: UUID
    batch_root: str
    size: int
    status: str
    tx_hash: str

# Finalize response schemas
class FinalizeResponse(BaseModel):
    credential_id: UUID
    merkle_root: str
    canonical_payload_hash: str
    status: str
    version: int
    blockchain_tx: Dict[str, Any]

class CohortFinalizeRequest(BaseModel):
    event_ids: List[UUID]

class CohortFinalizeResponse(BaseModel):
    finalized_count: int
    batch_root: str
    tx_hash: str

# Student credential list schemas
class CredentialResponseItem(BaseModel):
    id: UUID
    event_id: UUID
    merkle_root: str
    canonical_payload_hash: str
    status: str
    version: int
    created_at: datetime
    credential_type: str
    fields: Dict[str, Any]
    onchain_tx_hash: Optional[str] = None

    class Config:
        from_attributes = True

class StudentInfoSchema(BaseModel):
    id: UUID
    name: str
    email: str
    matriculation_no: str
    wallet_address: Optional[str] = None
    institution_id: Optional[UUID] = None
    full_name: Optional[str] = None
    registration_number: Optional[str] = None
    department_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    admission_year: Optional[int] = None
    expected_graduation_year: Optional[int] = None
    current_semester: Optional[int] = None
    academic_status: Optional[str] = None

class StudentCredentialsResponse(BaseModel):
    student_id: UUID
    name: str
    matriculation_no: str
    student: StudentInfoSchema
    credentials: List[CredentialResponseItem]

# Share permission schemas
class ShareRequest(BaseModel):
    verifier_email: Optional[str] = None
    verifier_label: Optional[str] = None
    expires_in_seconds: Optional[int] = None
    duration: Optional[str] = None
    fields_allowed: List[str] = Field(default_factory=list, description="Fields chosen to share selectively")

class ShareResponse(BaseModel):
    permission_id: UUID
    access_token: str
    expires_at: datetime

class VerifyResponse(BaseModel):
    status: str  # 'AUTHENTIC' | 'REVOKED' | 'TAMPERING_DETECTED'
    result: str  # 'verified' | 'revoked' | 'tampered' | 'review' | 'expired'
    student_name: str
    matriculation_no: str
    issuer_name: str
    issuer_code: str
    institution_name: str  # copy of issuer_name for frontend compatibility
    credential_id: UUID
    student_id: UUID
    event_type: str
    credential_type: str  # copy of event_type for frontend compatibility
    payload: Dict[str, Any]
    disclosed_fields: Dict[str, Any]  # copy of payload for frontend compatibility
    merkle_root: str
    onchain_status: str
    onchain_tx_hash: Optional[str] = None
    checks: Dict[str, bool]
    layered_checks: Dict[str, bool]
    consistency_errors: List[str]
    ai_explanation: Optional[str] = None
    salts: Dict[str, str] = Field(default_factory=dict)
    merkle_proofs: Dict[str, List[Dict[str, str]]] = Field(default_factory=dict)


# Document request schemas
class DocumentRequestCreate(BaseModel):
    institution_id: UUID
    request_type: str
    purpose: str
    details: Optional[str] = None

class DocumentRequestResponse(BaseModel):
    id: UUID
    student_id: UUID
    institution_id: UUID
    request_type: str
    purpose: str
    details: Optional[str]
    status: str
    response_notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepartmentCreate(BaseModel):
    name: str
    code: str


class ProgramCreate(BaseModel):
    department_id: Optional[UUID] = None
    name: str
    code: str
    degree_type: str
    duration_years: Optional[int] = None
    total_semesters: Optional[int] = None


class CourseCreate(BaseModel):
    department_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    course_code: str
    course_name: str
    credits: float = Field(gt=0, le=60)
    semester_number: Optional[int] = Field(default=None, ge=1, le=20)


class InstitutionStudentCreate(BaseModel):
    full_name: str = Field(min_length=2)
    email: EmailStr
    registration_number: str = Field(min_length=2)
    department_id: Optional[UUID] = None
    program_id: Optional[UUID] = None
    admission_year: Optional[int] = Field(default=None, ge=1900, le=2200)
    expected_graduation_year: Optional[int] = Field(default=None, ge=1900, le=2200)
    current_semester: Optional[int] = Field(default=None, ge=1, le=20)
    academic_status: str = "ACTIVE"


class EnrollmentCreate(BaseModel):
    program_id: UUID
    admission_date: datetime
    admission_year: int = Field(ge=1900, le=2200)


class CourseResultCreate(BaseModel):
    course_id: Optional[UUID] = None
    course_code: str
    course_name: str
    credits: float = Field(gt=0, le=60)
    grade: str = Field(min_length=1, max_length=3)
    marks: Optional[float] = Field(default=None, ge=0, le=100)


class SemesterRecordCreate(BaseModel):
    institution_id: UUID
    academic_year: str
    semester_number: int = Field(ge=1, le=20)
    semester_name: str
    course_results: List[CourseResultCreate] = Field(min_length=1)


class CourseResultResponse(CourseResultCreate):
    id: UUID
    grade_points: float

    class Config:
        from_attributes = True


class SemesterRecordResponse(BaseModel):
    id: UUID
    student_id: UUID
    institution_id: UUID
    academic_year: str
    semester_number: int
    semester_name: str
    total_credits: float
    gpa: float
    cgpa: float
    status: str
    course_results: List[CourseResultResponse]

    class Config:
        from_attributes = True


class DegreeRecordCreate(BaseModel):
    institution_id: UUID
    program_id: Optional[UUID] = None
    degree_name: str
    graduation_year: int = Field(ge=1900, le=2200)
    graduation_date: Optional[datetime] = None
    final_cgpa: Optional[float] = Field(default=None, ge=0, le=10)
    classification: Optional[str] = None


class MigrationRecordCreate(BaseModel):
    institution_id: UUID
    destination_institution: str
    reason: str
    last_completed_semester: Optional[int] = Field(default=None, ge=1, le=20)
    application_date: datetime


class AchievementCreate(BaseModel):
    title: str
    category: str
    issuer: str
    issue_date: datetime
    certificate_number: Optional[str] = None
    description: Optional[str] = None


class AcademicImportRow(BaseModel):
    registration_number: str
    academic_year: str
    semester_number: int = Field(ge=1, le=20)
    semester_name: str
    course_code: str
    course_name: str
    credits: float = Field(gt=0, le=60)
    grade: str = Field(min_length=1, max_length=3)
    marks: Optional[float] = Field(default=None, ge=0, le=100)


class AcademicImportRequest(BaseModel):
    import_type: str = "SEMESTER_RESULTS"
    file_name: str = "structured-records.json"
    rows: List[AcademicImportRow] = Field(min_length=1)


class ReviewCaseStatusUpdate(BaseModel):
    status: str = Field(pattern="^(APPROVED|REJECTED|CORRECTION_REQUESTED)$")

class DocumentRequestIssueRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


# Verification request schemas
class VerificationRequestCreate(BaseModel):
    verifier_org: str
    verifier_email: str
    student_id: UUID
    credential_id: UUID
    details: str

class VerificationRequestResponse(BaseModel):
    id: UUID
    verifier_org: str
    verifier_email: str
    student_id: UUID
    credential_id: UUID
    details: str
    status: str
    response_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Integrity request schemas
class IntegrityRequestCreate(BaseModel):
    verifier_org: str
    verifier_email: str
    credential_id: UUID
    academic_work_details: str
    concern: str

class IntegrityRequestResponse(BaseModel):
    id: UUID
    verifier_org: str
    verifier_email: str
    credential_id: UUID
    academic_work_details: str
    concern: str
    status: str
    response_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Notification schemas
class NotificationResponse(BaseModel):
    id: UUID
    user_id: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TamperSimulateRequest(BaseModel):
    credential_id: UUID
    field_name: Optional[str] = None
    field_to_tamper: Optional[str] = None
    new_value: str

# Revocation schemas
class RevokeResponse(BaseModel):
    credential_id: UUID
    status: str
    message: str
