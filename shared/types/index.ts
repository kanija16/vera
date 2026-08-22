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
  institution_id?: string;
  full_name?: string;
  registration_number?: string;
  department_id?: string;
  program_id?: string;
  admission_year?: number;
  expected_graduation_year?: number;
  current_semester?: number;
  academic_status?: string;
}

export interface CourseResult {
  id: string;
  course_id?: string | null;
  course_code: string;
  course_name: string;
  credits: number;
  grade: string;
  grade_points: number;
  marks?: number | null;
}

export interface SemesterRecord {
  id: string;
  student_id: string;
  institution_id: string;
  academic_year: string;
  semester_number: number;
  semester_name: string;
  total_credits: number;
  gpa: number;
  cgpa: number;
  status: string;
  course_results: CourseResult[];
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

export interface ShareResponse {
  permission_id: string;
  access_token: string;
  expires_at: string;
}

export interface AccessLog {
  event_time: string;
  verifier_label: string;
  credential_type: string;
  disclosed_fields_count: number;
  result: string;
  permission_id?: string | null;
}

export interface VerifyResponse {
  status: string;
  result: string;
  student_name: string;
  matriculation_no: string;
  issuer_name: string;
  issuer_code: string;
  institution_name: string;
  credential_id: string;
  student_id: string;
  event_type: string;
  credential_type: string;
  payload: Record<string, unknown>;
  disclosed_fields: Record<string, unknown>;
  merkle_root: string;
  onchain_status: string;
  onchain_tx_hash?: string | null;
  checks: Record<string, boolean>;
  layered_checks: Record<string, boolean>;
  consistency_errors: string[];
  ai_explanation?: string | null;
  salts: Record<string, string>;
  merkle_proofs: Record<string, Array<Record<string, string>>>;
}

export function truncateHash(value?: string | null, length = 16): string {
  return value ? `${value.slice(0, length)}...` : "Not anchored";
}

export function formatCredentialType(value?: string | null): string {
  if (!value) return "Unknown Credential";
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatFieldName(value?: string | null): string {
  return value ? value.replace(/_/g, " ") : "Unknown Field";
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
