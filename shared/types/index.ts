export interface Institution {
  id: string;
  name: string;
  code: string;
  status: 'PENDING' | 'ACCREDITED' | 'SUSPENDED' | 'REVOKED';
  is_verified: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  matriculation_no: string;
  wallet_address?: string;
}

export interface AcademicEvent {
  event_id: string;
  student_name: string;
  student_id: string;
  event_type: 'ENROLLMENT' | 'SEMESTER_FINAL' | 'DEGREE_AWARD' | 'MIGRATION_REQ';
  event_date: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'VALID' | 'SUSPICIOUS_REVIEW' | 'REJECTED' | 'CLERK_SIGNED' | 'ISSUED';
  trust_score: number;
}

export interface Credential {
  id: string;
  event_id: string;
  student_id: string;
  merkle_root: string;
  canonical_payload_hash: string;
  status: 'ACTIVE' | 'REVOKED';
  version: number;
  created_at: string;
  credential_type: string;
  fields: Record<string, any>;
  onchain_tx_hash?: string;
  student_name?: string; // resolved locally or returned in registry lists
}

export interface Permission {
  id: string;
  credential_id: string;
  student_id: string;
  verifier_email: string;
  access_token: string;
  fields_allowed: string[];
  expires_at: string;
  is_revoked: boolean;
}

export interface AuditLog {
  id: string;
  time: string;
  actor: string;
  action: string;
  details?: any;
}

export interface DocumentRequest {
  id: string;
  student_id: string;
  institution_id: string;
  request_type: string;
  purpose: string;
  details?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'ISSUED';
  response_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  verifier_org: string;
  verifier_email: string;
  student_id: string;
  credential_id: string;
  details: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'CONFIRMED' | 'REJECTED';
  response_notes?: string;
  created_at: string;
}

export interface IntegrityRequest {
  id: string;
  verifier_org: string;
  verifier_email: string;
  credential_id: string;
  academic_work_details: string;
  concern: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'NO_ISSUE_FOUND' | 'REQUIRES_REVIEW' | 'INCONSISTENCY_DETECTED';
  response_notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
