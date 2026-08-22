import {
  Institution,
  Student,
  AcademicEvent,
  Credential,
  Permission,
  AuditLog,
  DocumentRequest,
  VerificationRequest,
  IntegrityRequest,
  Notification,
  ShareResponse,
  AccessLog,
  VerifyResponse
} from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    }
  });

  if (!response.ok) {
    let errorDetail = 'API Request Failed';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errData.message || errorDetail;
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Institutions
  getInstitutions: () => request<Institution[]>('/institutions'),
  createInstitution: (data: { name: string; code: string; is_verified?: boolean }) => 
    request<Institution>('/institutions', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateInstitutionStatus: (id: string, status: string) =>
    request<Institution>(`/institutions/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),
  getInstitutionEvents: (id: string) => request<AcademicEvent[]>(`/institutions/${id}/events`),
  ingestEvent: (instId: string, data: { student_id: string; event_type: string; payload: any; event_date?: string }) =>
    request<any>(`/institutions/${instId}/events`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  proposeEvent: (instId: string, eventId: string, clerkId: string) =>
    request<any>(`/institutions/${instId}/events/${eventId}/propose`, {
      method: 'POST',
      body: JSON.stringify({ clerk_id: clerkId })
    }),
  approveEvent: (instId: string, eventId: string, examOfficerId: string) =>
    request<any>(`/institutions/${instId}/events/${eventId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ exam_officer_id: examOfficerId })
    }),
  finalizeEvent: (instId: string, eventId: string) =>
    request<any>(`/institutions/${instId}/events/${eventId}/finalize`, {
      method: 'POST'
    }),
  finalizeCohort: (instId: string, eventIds: string[]) =>
    request<{ finalized_count: number; batch_root: string; tx_hash: string }>(`/institutions/${instId}/events/finalize-cohort`, {
      method: 'POST',
      body: JSON.stringify({ event_ids: eventIds })
    }),
  anchorBatch: (instId: string) =>
    request<any>(`/institutions/${instId}/anchor-batch`, {
      method: 'POST'
    }),
  getInstitutionAuditTrail: (id: string) => request<{ audit_logs: AuditLog[] }>(`/institutions/${id}/audit-trail`),

  // Students
  getStudents: () => request<Student[]>('/students'),
  getStudent: (id: string) => request<Student>(`/students/${id}`),
  createInstitutionStudent: (instId: string, data: { full_name: string; email: string; registration_number: string; department_id?: string; program_id?: string; admission_year?: number; expected_graduation_year?: number; current_semester?: number; academic_status?: string }) => request<Student>(`/institutions/${instId}/students`, { method: 'POST', body: JSON.stringify(data) }),
  createDepartment: (instId: string, data: { name: string; code: string }) => request<any>(`/institutions/${instId}/departments`, { method: 'POST', body: JSON.stringify(data) }),
  getDepartments: (instId: string) => request<any[]>(`/institutions/${instId}/departments`),
  createProgram: (instId: string, data: { name: string; code: string; degree_type: string; department_id?: string; duration_years?: number; total_semesters?: number }) => request<any>(`/institutions/${instId}/programs`, { method: 'POST', body: JSON.stringify(data) }),
  getPrograms: (instId: string) => request<any[]>(`/institutions/${instId}/programs`),
  createCourse: (instId: string, data: { course_code: string; course_name: string; credits: number; department_id?: string; program_id?: string; semester_number?: number }) => request<any>(`/institutions/${instId}/courses`, { method: 'POST', body: JSON.stringify(data) }),
  getCourses: (instId: string) => request<any[]>(`/institutions/${instId}/courses`),
  analyzeAcademicImport: (instId: string, data: { import_type?: string; file_name?: string; rows: Array<{ registration_number: string; academic_year: string; semester_number: number; semester_name: string; course_code: string; course_name: string; credits: number; grade: string; marks?: number }> }) => request<any>(`/institutions/${instId}/imports/analyze`, { method: 'POST', body: JSON.stringify(data) }),
  getReviewCases: (instId: string) => request<any[]>(`/institutions/${instId}/review-cases`),
  updateReviewCase: (instId: string, caseId: string, status: 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED') => request<any>(`/institutions/${instId}/review-cases/${caseId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  createStudent: (data: { name: string; email: string; matriculation_no: string; wallet_address?: string }) =>
    request<Student>('/students', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getStudentCredentials: (studentId: string) =>
    request<{ student_id: string; name: string; matriculation_no: string; student: Student; credentials: Credential[] }>(
      `/students/${studentId}/credentials`
    ),
  getStudentSummary: (studentId: string) => request<{ summary: string; grounded_in: string }>(`/ai/student-summary/${studentId}`),
  getStudentEvents: (studentId: string) => request<any[]>(`/students/${studentId}/events`),
  createEnrollment: (studentId: string, data: { program_id: string; admission_date: string; admission_year: number }) => request<any>(`/students/${studentId}/enrollment`, { method: 'POST', body: JSON.stringify(data) }),
  createSemesterRecord: (studentId: string, data: { institution_id: string; academic_year: string; semester_number: number; semester_name: string; course_results: Array<{ course_id?: string; course_code: string; course_name: string; credits: number; grade: string; marks?: number }> }) => request<any>(`/students/${studentId}/semester-records`, { method: 'POST', body: JSON.stringify(data) }),
  getSemesterRecords: (studentId: string) => request<any[]>(`/students/${studentId}/semester-records`),
  getAcademicProfile: (studentId: string) => request<any>(`/students/${studentId}/academic-profile`),
  createDegreeRecord: (studentId: string, data: { institution_id: string; degree_name: string; graduation_year: number; program_id?: string; graduation_date?: string; final_cgpa?: number; classification?: string }) => request<any>(`/students/${studentId}/degree-records`, { method: 'POST', body: JSON.stringify(data) }),
  createMigrationRecord: (studentId: string, data: { institution_id: string; destination_institution: string; reason: string; last_completed_semester?: number; application_date: string }) => request<any>(`/students/${studentId}/migration-records`, { method: 'POST', body: JSON.stringify(data) }),
  createAchievement: (studentId: string, data: { title: string; category: string; issuer: string; issue_date: string; certificate_number?: string; description?: string }) => request<any>(`/students/${studentId}/achievements`, { method: 'POST', body: JSON.stringify(data) }),
  getStudentAccessHistory: (studentId: string) => request<{ access_logs: AccessLog[] }>(`/students/${studentId}/access-history`),
  getStudentPermissions: (studentId: string) => request<Permission[]>(`/students/${studentId}/permissions`),

  // Document Requests
  createDocumentRequest: (studentId: string, data: { institution_id: string; request_type: string; purpose: string; details?: string }) =>
    request<DocumentRequest>(`/students/${studentId}/document-requests`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getStudentDocumentRequests: (studentId: string) =>
    request<DocumentRequest[]>(`/students/${studentId}/document-requests`),
  getInstitutionDocumentRequests: (instId: string) =>
    request<DocumentRequest[]>(`/institutions/${instId}/document-requests`),
  updateDocumentRequestStatus: (instId: string, reqId: string, status: string, responseNotes?: string) =>
    request<DocumentRequest>(`/institutions/${instId}/document-requests/${reqId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, response_notes: responseNotes })
    }),
  issueDocumentRequest: (instId: string, reqId: string, payload: Record<string, unknown> = {}) =>
    request<any>(`/institutions/${instId}/document-requests/${reqId}/issue`, {
      method: 'POST',
      body: JSON.stringify({ payload })
    }),

  // Sharing & Permissions
  shareCredential: (credId: string, data: { verifier_email?: string; verifier_label?: string; expires_in_seconds?: number; duration?: string; fields_allowed: string[] }) =>
    request<ShareResponse>(`/credentials/${credId}/share`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  revokePermission: (permissionId: string) =>
    request<{ message: string }>(`/permissions/${permissionId}/revoke`, {
      method: 'POST'
    }),

  // Verification Portal
  verifyToken: (accessToken: string) => request<VerifyResponse>(`/verify/${accessToken}`),
  createVerificationRequest: (data: { verifier_org: string; verifier_email: string; student_id: string; credential_id: string; details: string }) =>
    request<VerificationRequest>('/verify/verification-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getInstitutionVerificationRequests: (instId: string) =>
    request<VerificationRequest[]>(`/institutions/${instId}/verification-requests`),
  updateVerificationRequestStatus: (instId: string, reqId: string, status: string, responseNotes?: string) =>
    request<VerificationRequest>(`/institutions/${instId}/verification-requests/${reqId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, response_notes: responseNotes })
    }),
  getVerificationRequest: (reqId: string) => request<VerificationRequest>(`/verify/verification-requests/${reqId}`),

  // Plagiarism & Integrity
  createIntegrityRequest: (data: { verifier_org: string; verifier_email: string; credential_id: string; academic_work_details: string; concern: string }) =>
    request<IntegrityRequest>('/verify/integrity-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getInstitutionIntegrityRequests: (instId: string) =>
    request<IntegrityRequest[]>(`/institutions/${instId}/integrity-requests`),
  updateIntegrityRequestStatus: (instId: string, reqId: string, status: string, responseNotes?: string) =>
    request<IntegrityRequest>(`/institutions/${instId}/integrity-requests/${reqId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, response_notes: responseNotes })
    }),
  getIntegrityRequest: (reqId: string) => request<IntegrityRequest>(`/verify/integrity-requests/${reqId}`),

  // Notifications
  getStudentNotifications: (studentId: string) => request<Notification[]>(`/students/${studentId}/notifications`),
  markStudentNotificationsRead: (studentId: string) =>
    request<{ message: string }>(`/students/${studentId}/notifications/read`, {
      method: 'POST'
    }),
  getInstitutionNotifications: (code: string) => request<Notification[]>(`/institutions/${code}/notifications`),

  // Sandbox / Demo controls
  tamperRecord: (data: { credential_id: string; field_name?: string; field_to_tamper?: string; new_value: string }) =>
    request<{ message: string }>('/demo/tamper', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  revokeOnChain: (credId: string) =>
    request<{ credential_id: string; status: string; message: string }>(`/credentials/${credId}/revoke`, {
      method: 'POST'
    }),
  resetDatabase: () => request<{ message: string }>('/demo/reset', { method: 'POST' })
};
