import json
import uuid
from datetime import datetime
from typing import List, Tuple, Dict, Any
from sqlalchemy.future import select
from app.models import Student, AcademicEvent, Institution, EventType, EventStatus

class ConsistencyAnomalyEngine:
    def __init__(self, db_session):
        self.db = db_session

    async def get_student_history(self, student_id: str) -> List[AcademicEvent]:
        # Query academic events asynchronously, ordered by event_date
        query = select(AcademicEvent).filter(AcademicEvent.student_id == student_id).order_by(AcademicEvent.created_at.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def evaluate_event(
        self, 
        institution_id: str, 
        student_id: str, 
        event_type: str, 
        payload: Dict[str, Any], 
        event_date: datetime
    ) -> Tuple[str, float, List[str]]:
        """
        Runs deterministic rule checks, calculates Trust Score, and assigns status.
        Returns: Tuple[Status, TrustScore, ErrorsList]
        """
        errors = []
        trust_score = 1.0
        
        # 1. Fetch Student & Institution
        student_res = await self.db.execute(select(Student).filter(Student.id == student_id))
        student = student_res.scalar_one_or_none()
        if not student:
            return EventStatus.REJECTED.value, 0.0, ["STUDENT_NOT_FOUND"]
            
        inst_res = await self.db.execute(select(Institution).filter(Institution.id == institution_id))
        inst = inst_res.scalar_one_or_none()
        if not inst:
            return EventStatus.REJECTED.value, 0.0, ["INSTITUTION_NOT_FOUND"]
            
        # 2. Rule Check 1: Identity Integrity (Matriculation No consistency)
        payload_matric = payload.get("matriculation_no")
        if payload_matric and payload_matric != student.matriculation_no:
            errors.append(
                f"IDENTITY_MISMATCH: Payload matriculation_no '{payload_matric}' "
                f"does not match student record '{student.matriculation_no}'"
            )
            trust_score -= 0.5
            
        # 3. Rule Check 2: Temporal Constraints (Chronology check)
        history = await self.get_student_history(student_id)
        
        # Loop through existing events to check sequence ordering
        for old_ev in history:
            old_date = old_ev.created_at
            
            # Map tzinfo naive/aware
            if event_date.tzinfo is not None:
                event_date = event_date.replace(tzinfo=None)
            if old_date.tzinfo is not None:
                old_date = old_date.replace(tzinfo=None)
                
            # Rule 2a: DEGREE_AWARD date must strictly follow ENROLLMENT date
            if event_type == EventType.DEGREE_AWARD.value and old_ev.event_type == EventType.ENROLLMENT.value:
                if event_date < old_date:
                    errors.append(
                        f"TIMELINE_INCONSISTENCY: DEGREE_AWARD ({event_date.date()}) "
                        f"predates ENROLLMENT ({old_date.date()})"
                    )
                    trust_score -= 0.4
                    
            if event_type == EventType.ENROLLMENT.value and old_ev.event_type == EventType.DEGREE_AWARD.value:
                if event_date > old_date:
                    errors.append(
                        f"TIMELINE_INCONSISTENCY: ENROLLMENT ({event_date.date()}) "
                        f"postdates DEGREE_AWARD ({old_date.date()})"
                    )
                    trust_score -= 0.4

            # Rule 2b: MIGRATION_REQ date must strictly follow DEGREE_AWARD / ENROLLMENT
            if event_type == EventType.MIGRATION_REQ.value:
                if old_ev.event_type in (EventType.ENROLLMENT.value, EventType.DEGREE_AWARD.value):
                    if event_date < old_date:
                        errors.append(
                            f"TIMELINE_INCONSISTENCY: MIGRATION_REQ ({event_date.date()}) "
                            f"predates {old_ev.event_type} ({old_date.date()})"
                        )
                        trust_score -= 0.5

            if old_ev.event_type == EventType.MIGRATION_REQ.value:
                if event_type in (EventType.ENROLLMENT.value, EventType.DEGREE_AWARD.value):
                    if event_date > old_date:
                        errors.append(
                            f"TIMELINE_INCONSISTENCY: {event_type} ({event_date.date()}) "
                            f"postdates MIGRATION_REQ ({old_date.date()})"
                        )
                        trust_score -= 0.5
                        
        # 4. Check 3: Institution Verification check
        if not inst.is_verified:
            errors.append("UNVERIFIED_ISSUER: Institution is not verified in trusted registry.")
            trust_score -= 0.2
            
        # 5. Check 4: Payload Completeness
        if event_type == EventType.SEMESTER_FINAL.value:
            expected_fields = ["semester", "gpa", "credits"]
            for field in expected_fields:
                if field not in payload:
                    errors.append(f"MISSING_FIELD: '{field}' missing in semester finals payload")
                    trust_score -= 0.1
                    
        # Clamp Trust Score
        trust_score = max(0.0, min(1.0, round(trust_score, 2)))
        
        # 6. Assign status
        if len(errors) > 0 or trust_score < 0.85:
            # If timeline contradiction, or trust score drops below threshold -> flag for review
            # Check if there's any absolute rejection conditions (like student mismatch)
            is_rejected = any("IDENTITY_MISMATCH" in err for err in errors)
            if is_rejected:
                status_res = EventStatus.REJECTED.value
            else:
                status_res = EventStatus.SUSPICIOUS_REVIEW.value
        else:
            status_res = EventStatus.VALID.value
            
        return status_res, trust_score, errors


# Seeding logic helper
async def seed_emily_white(db):
    # Check if Emily White exists
    stmt = select(Student).filter(Student.email == "emily.white@example.com")
    res = await db.execute(stmt)
    if res.scalar_one_or_none() is not None:
        return
        
    print("Pre-seeding Emily White consistent + inconsistent events...")
    
    # 1. Trusted Institution
    inst = Institution(
        id=uuid.UUID("a1111111-1111-1111-1111-111111111111"),
        name="Amrita University",
        code="AMRITA-UNIV",
        public_key="MOCK_PUBLIC_KEY_PEM_AMRITA",
        is_verified=True,
        created_at=datetime(2022, 1, 1)
    )
    db.add(inst)
    
    # 2. Student Emily
    emily = Student(
        id=uuid.UUID("b5555555-5555-5555-5555-555555555555"),
        name="Emily White",
        email="emily.white@example.com",
        matriculation_no="MAT-2022-005",
        wallet_address="0x7777777777777777777777777777777777777777"
    )
    db.add(emily)
    await db.commit()
    
    # 3. Create Events
    # Event 1: Enrollment (Valid, 2022-09-01)
    e1 = AcademicEvent(
        id=uuid.UUID("c1111111-1111-1111-1111-111111111111"),
        institution_id=inst.id,
        student_id=emily.id,
        event_type=EventType.ENROLLMENT.value,
        payload={"matriculation_no": "MAT-2022-005", "program": "B.Tech CSE"},
        trust_score=1.0,
        status=EventStatus.VALID.value,
        created_at=datetime(2022, 9, 1)
    )
    db.add(e1)
    
    # Event 2: Semester Final (Valid, 2023-01-20)
    e2 = AcademicEvent(
        id=uuid.UUID("c2222222-2222-2222-2222-222222222222"),
        institution_id=inst.id,
        student_id=emily.id,
        event_type=EventType.SEMESTER_FINAL.value,
        payload={"matriculation_no": "MAT-2022-005", "semester": "Semester 1", "gpa": "8.5", "credits": "20"},
        trust_score=1.0,
        status=EventStatus.VALID.value,
        created_at=datetime(2023, 1, 20)
    )
    db.add(e2)
    
    # Event 3: Migration request (Inconsistent: dated 2021-06-01 - predates enrollment!)
    e3 = AcademicEvent(
        id=uuid.UUID("c3333333-3333-3333-3333-333333333333"),
        institution_id=inst.id,
        student_id=emily.id,
        event_type=EventType.MIGRATION_REQ.value,
        payload={"matriculation_no": "MAT-2022-005", "destination": "Foreign Tech", "reason": "Transfer"},
        trust_score=0.5, # Reduced trust score due to temporal constraint failure
        status=EventStatus.SUSPICIOUS_REVIEW.value, # Mapped to SUSPICIOUS_REVIEW
        created_at=datetime(2021, 6, 1)
    )
    db.add(e3)
    
    await db.commit()
    print("Emily White records seeded.")
