import uuid
import json
from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Table, Float, Integer, JSON
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

Base = declarative_base()

# Platform-independent GUID type mapping
class GUID(TypeDecorator):
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            return str(value)

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

# Python Enums for DB compatibility
class EventType(str, Enum):
    ENROLLMENT = "ENROLLMENT"
    SEMESTER_FINAL = "SEMESTER_FINAL"
    DEGREE_AWARD = "DEGREE_AWARD"
    MIGRATION_REQ = "MIGRATION_REQ"

class EventStatus(str, Enum):
    PENDING = "PENDING"
    VALID = "VALID"
    SUSPICIOUS_REVIEW = "SUSPICIOUS_REVIEW"
    REJECTED = "REJECTED"

class CredentialStatus(str, Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"


class Institution(Base):
    __tablename__ = 'institution'
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False, unique=True)
    public_key = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    events = relationship("AcademicEvent", back_populates="institution", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = 'student'
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    matriculation_no = Column(String, nullable=False, unique=True)
    wallet_address = Column(String, nullable=True, unique=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    events = relationship("AcademicEvent", back_populates="student", cascade="all, delete-orphan")
    credentials = relationship("Credential", back_populates="student", cascade="all, delete-orphan")
    permissions = relationship("Permission", back_populates="student", cascade="all, delete-orphan")


class AcademicEvent(Base):
    __tablename__ = 'academic_event'
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    institution_id = Column(GUID, ForeignKey('institution.id'), nullable=False)
    student_id = Column(GUID, ForeignKey('student.id'), nullable=False)
    event_type = Column(String, nullable=False)  # Map to EventType enum
    payload = Column(SafeJSONB, nullable=False)
    trust_score = Column(Float, default=1.0)
    status = Column(String, default="PENDING")  # Map to EventStatus enum
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    institution = relationship("Institution", back_populates="events")
    student = relationship("Student", back_populates="events")
    credential = relationship("Credential", back_populates="source_event", uselist=False, cascade="all, delete-orphan")


class Credential(Base):
    __tablename__ = 'credential'
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    event_id = Column(GUID, ForeignKey('academic_event.id'), nullable=False)
    student_id = Column(GUID, ForeignKey('student.id'), nullable=False)
    merkle_root = Column(String, nullable=False)
    canonical_payload_hash = Column(String, nullable=False)
    salts = Column(SafeJSONB, nullable=False)  # Added column for privacy-preserving verification
    status = Column(String, default="ACTIVE")  # Map to CredentialStatus enum
    version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    source_event = relationship("AcademicEvent", back_populates="credential")
    student = relationship("Student", back_populates="credentials")
    permissions = relationship("Permission", back_populates="credential", cascade="all, delete-orphan")


class CredentialRelationship(Base):
    __tablename__ = 'credential_relationship'
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    parent_credential_id = Column(GUID, ForeignKey('credential.id'), nullable=False)
    child_credential_id = Column(GUID, ForeignKey('credential.id'), nullable=False)
    relationship_type = Column(String, nullable=False)  # 'precedes' | 'supersedes' | 'depends_on'


class Permission(Base):
    __tablename__ = 'permission'
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    credential_id = Column(GUID, ForeignKey('credential.id'), nullable=False)
    student_id = Column(GUID, ForeignKey('student.id'), nullable=False)
    verifier_email = Column(String, nullable=False)
    access_token = Column(String, nullable=False, unique=True)
    fields_allowed = Column(SafeJSONB, nullable=False)  # Added column for selective disclosure config
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False)
    
    credential = relationship("Credential", back_populates="permissions")
    student = relationship("Student", back_populates="permissions")


class AuditLog(Base):
    __tablename__ = 'audit_log'
    
    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    actor_id = Column(String, nullable=False)
    action = Column(String, nullable=False)
    target_id = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    details = Column(SafeJSONB, nullable=True)
