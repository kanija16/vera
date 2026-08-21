import uuid
import json
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, TEXT, JSON
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

# Safe JSONB type mapping
class SafeJSONB(TypeDecorator):
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import JSONB
            return dialect.type_descriptor(JSONB)
        else:
            return dialect.type_descriptor(JSON)

# Safe ARRAY type mapping
class SafeArray(TypeDecorator):
    impl = TEXT
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            from sqlalchemy.dialects.postgresql import ARRAY
            return dialect.type_descriptor(ARRAY(String))
        else:
            return dialect.type_descriptor(TEXT)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            return value
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if dialect.name == 'postgresql':
            return value
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        return value


class Institution(Base):
    __tablename__ = 'institution'
    
    institution_id = Column(UUID_TYPE := String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    wallet_address = Column(String, nullable=False, unique=True)
    status = Column(String, default='VERIFIED')  # 'PENDING' | 'VERIFIED' | 'SUSPENDED'
    
    events = relationship("AcademicEvent", back_populates="institution")
    credentials = relationship("Credential", back_populates="institution")


class Student(Base):
    __tablename__ = 'student'
    
    student_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name = Column(String, nullable=False)
    identity_ref = Column(String, unique=True, nullable=True)
    wallet_address = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    events = relationship("AcademicEvent", back_populates="student")
    credentials = relationship("Credential", back_populates="student")


class AcademicEvent(Base):
    __tablename__ = 'academic_event'
    
    event_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey('student.student_id'), nullable=False)
    institution_id = Column(String, ForeignKey('institution.institution_id'), nullable=False)
    event_type = Column(String, nullable=False)  # 'admission' | 'semester_lock' | 'convocation' | 'migration'
    payload = Column(SafeJSONB, nullable=False)
    event_date = Column(DateTime(timezone=True), nullable=False)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    triggered_issuance = Column(Boolean, default=False)
    
    student = relationship("Student", back_populates="events")
    institution = relationship("Institution", back_populates="events")
    credentials = relationship("Credential", back_populates="source_event")


class Credential(Base):
    __tablename__ = 'credential'
    
    credential_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey('student.student_id'), nullable=False)
    institution_id = Column(String, ForeignKey('institution.institution_id'), nullable=False)
    credential_type = Column(String, nullable=False)  # 'transcript' | 'degree' | 'migration_certificate'
    fields = Column(SafeJSONB, nullable=False)
    salts = Column(SafeJSONB, nullable=False)
    merkle_root = Column(String, nullable=False)
    onchain_tx_hash = Column(String, nullable=True)
    issued_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    status = Column(String, default='active')  # 'active' | 'revoked'
    source_event_id = Column(String, ForeignKey('academic_event.event_id'), nullable=True)
    
    student = relationship("Student", back_populates="credentials")
    institution = relationship("Institution", back_populates="credentials")
    source_event = relationship("AcademicEvent", back_populates="credentials")
    
    permissions = relationship("Permission", back_populates="credential")
    verification_events = relationship("VerificationEvent", back_populates="credential")


class CredentialRelationship(Base):
    __tablename__ = 'credential_relationship'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    source_credential_id = Column('source_credential', String, ForeignKey('credential.credential_id'), nullable=False)
    target_credential_id = Column('target_credential', String, ForeignKey('credential.credential_id'), nullable=False)
    relationship_type = Column(String, nullable=False)  # 'precedes' | 'supersedes' | 'depends_on'


class Permission(Base):
    __tablename__ = 'permission'
    
    permission_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    credential_id = Column(String, ForeignKey('credential.credential_id'), nullable=False)
    verifier_label = Column(String, nullable=True)
    fields_allowed = Column(SafeArray, nullable=False)
    verification_pass_token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    credential = relationship("Credential", back_populates="permissions")
    verification_events = relationship("VerificationEvent", back_populates="permission")


class VerificationEvent(Base):
    __tablename__ = 'verification_event'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    credential_id = Column(String, ForeignKey('credential.credential_id'), nullable=False)
    permission_id = Column(String, ForeignKey('permission.permission_id'), nullable=False)
    result = Column(String, nullable=False)  # 'verified' | 'review' | 'tampered' | 'revoked'
    checked_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    credential = relationship("Credential", back_populates="verification_events")
    permission = relationship("Permission", back_populates="verification_events")


class AuditEvent(Base):
    __tablename__ = 'audit_event'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    object_id = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
