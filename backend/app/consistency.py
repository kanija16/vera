from datetime import datetime
from typing import List, Tuple, Dict, Any
from app.models import Credential, AcademicEvent

def make_naive(dt: Any) -> datetime:
    if isinstance(dt, str):
        dt = datetime.fromisoformat(dt.replace('Z', '+00:00'))
    if dt.tzinfo is not None:
        return dt.replace(tzinfo=None)
    return dt

class AcademicConsistencyEngine:
    def __init__(self, db_session):
        self.db = db_session

    def get_credentials_for_student(self, student_id: str) -> List[Dict[str, Any]]:
        # Retrieve all credentials and relevant academic events to form a timeline
        creds = self.db.query(Credential).filter(Credential.student_id == student_id).all()
        events = self.db.query(AcademicEvent).filter(AcademicEvent.student_id == student_id).all()
        
        records = []
        for c in creds:
            records.append({
                "type": c.credential_type, # 'transcript' | 'degree' | 'migration_certificate'
                "issuanceDate": c.issued_at.isoformat() if hasattr(c.issued_at, 'isoformat') else str(c.issued_at)
            })
            
        for e in events:
            # Map database event types to equivalent credential types for rule checking
            mapped_type = None
            if e.event_type == 'admission':
                mapped_type = 'AdmissionRecord'
            elif e.event_type == 'convocation':
                mapped_type = 'AcademicDegreeCredential'
            elif e.event_type == 'semester_lock':
                mapped_type = 'SemesterRecord'
                
            if mapped_type:
                records.append({
                    "type": mapped_type,
                    "issuanceDate": e.event_date.isoformat() if hasattr(e.event_date, 'isoformat') else str(e.event_date)
                })
                
        return records

    def evaluate_new_credential(self, student_id: str, new_credential: Dict[str, Any]) -> Tuple[bool, List[str]]:
        errors = []
        existing = self.get_credentials_for_student(student_id)
        
        # Parse the new credential's date and make naive
        new_date = make_naive(new_credential.get("issuanceDate"))
            
        # RULE 1 (BUILD THIS): Sequence order — migration cannot predate admission/degree
        for cred in existing:
            existing_date = make_naive(cred.get("issuanceDate"))
                
            # If the new credential is a Migration Certificate
            if new_credential.get("type") in ("MigrationCertificate", "migration_certificate"):
                if cred.get("type") in ("AdmissionRecord", "admission", "AcademicDegreeCredential", "degree", "convocation"):
                    if new_date < existing_date:
                        errors.append(
                            f"TIMELINE_INCONSISTENCY: Migration Certificate ({new_date.date()}) predates {cred['type']} ({existing_date.date()})"
                        )
                        
            # Conversely, if we are evaluating an Admission or Degree but a Migration already exists
            if new_credential.get("type") in ("AdmissionRecord", "admission", "AcademicDegreeCredential", "degree", "convocation"):
                if cred.get("type") in ("MigrationCertificate", "migration_certificate"):
                    if new_date > existing_date:
                        errors.append(
                            f"TIMELINE_INCONSISTENCY: {new_credential.get('type')} ({new_date.date()}) postdates Migration Certificate ({existing_date.date()})"
                        )
                        
        return (len(errors) == 0, errors)
