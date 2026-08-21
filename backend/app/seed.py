import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models import Base, Institution, Student, AcademicEvent, Credential
from app.merkle import MerkleTreeEngine

def seed_db():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Institution).first() is not None:
            print("Database already seeded. Skipping...")
            return
            
        print("Seeding database...")
        
        # 1. Institutions
        inst1 = Institution(
            institution_id="a1111111-1111-1111-1111-111111111111",
            name="Amrita University",
            wallet_address="0x1111111111111111111111111111111111111111",
            status="VERIFIED"
        )
        inst2 = Institution(
            institution_id="a2222222-2222-2222-2222-222222222222",
            name="Unverified Academy",
            wallet_address="0x2222222222222222222222222222222222222222",
            status="PENDING"
        )
        db.add_all([inst1, inst2])
        
        # 2. Students
        s1 = Student(
            student_id="b1111111-1111-1111-1111-111111111111",
            full_name="Alice Smith",
            identity_ref="CS-2022-001",
            wallet_address="0x3333333333333333333333333333333333333333"
        )
        s2 = Student(
            student_id="b2222222-2222-2222-2222-222222222222",
            full_name="Bob Jones",
            identity_ref="CS-2022-002",
            wallet_address="0x4444444444444444444444444444444444444444"
        )
        s3 = Student(
            student_id="b3333333-3333-3333-3333-333333333333",
            full_name="Charlie Brown",
            identity_ref="CS-2022-003",
            wallet_address="0x5555555555555555555555555555555555555555"
        )
        s4 = Student(
            student_id="b4444444-4444-4444-4444-444444444444",
            full_name="David Green",
            identity_ref="CS-2022-004",
            wallet_address="0x6666666666666666666666666666666666666666"
        )
        s5 = Student(
            student_id="b5555555-5555-5555-5555-555555555555",
            full_name="Emily White",
            identity_ref="CS-2022-005",
            wallet_address="0x7777777777777777777777777777777777777777"
        )
        db.add_all([s1, s2, s3, s4, s5])
        
        # 3. Emily White's Inconsistent Record (Migration pre-dates Admission)
        # Event 1: Admission
        adm_event = AcademicEvent(
            event_id="c1111111-1111-1111-1111-111111111111",
            student_id=s5.student_id,
            institution_id=inst1.institution_id,
            event_type="admission",
            payload={"program": "B.Tech Computer Science", "admission_year": "2022"},
            event_date=datetime(2022, 9, 1, tzinfo=timezone.utc),
            finalized_at=datetime(2022, 9, 1, tzinfo=timezone.utc),
            triggered_issuance=True
        )
        db.add(adm_event)
        
        # Event 2: Migration (deliberately dated BEFORE admission: 2021-06-01)
        mig_event = AcademicEvent(
            event_id="c2222222-2222-2222-2222-222222222222",
            student_id=s5.student_id,
            institution_id=inst1.institution_id,
            event_type="migration",
            payload={"migration_to": "Foreign University", "reason": "Transfer"},
            event_date=datetime(2021, 6, 1, tzinfo=timezone.utc),
            finalized_at=datetime(2021, 6, 1, tzinfo=timezone.utc),
            triggered_issuance=True
        )
        db.add(mig_event)
        
        # Commit to save events
        db.commit()
        
        # Generate credentials for Emily White
        # We need to compile Merkle trees and sign them
        
        # 3a. Admission Credential for Emily
        adm_fields = {
            "student_name": s5.full_name,
            "roll_number": s5.identity_ref,
            "program": "B.Tech Computer Science",
            "admission_year": "2022"
        }
        adm_salts = {k: "salt_adm_" + k for k in adm_fields.keys()}
        adm_merkle = MerkleTreeEngine(adm_fields, adm_salts)
        
        c_adm = Credential(
            credential_id="d1111111-1111-1111-1111-111111111111",
            student_id=s5.student_id,
            institution_id=inst1.institution_id,
            credential_type="transcript", # For Rule 1 Admission check
            fields=adm_fields,
            salts=adm_salts,
            merkle_root=adm_merkle.get_root().hex(),
            onchain_tx_hash="0xmocktxhash111111111111111111111111111111111111111111111111111",
            issued_at=datetime(2022, 9, 1, tzinfo=timezone.utc),
            status="active",
            source_event_id=adm_event.event_id
        )
        db.add(c_adm)
        
        # 3b. Inconsistent Migration Credential for Emily
        mig_fields = {
            "student_name": s5.full_name,
            "roll_number": s5.identity_ref,
            "migration_to": "Foreign University",
            "reason": "Transfer"
        }
        mig_salts = {k: "salt_mig_" + k for k in mig_fields.keys()}
        mig_merkle = MerkleTreeEngine(mig_fields, mig_salts)
        
        c_mig = Credential(
            credential_id="d2222222-2222-2222-2222-222222222222",
            student_id=s5.student_id,
            institution_id=inst1.institution_id,
            credential_type="migration_certificate",
            fields=mig_fields,
            salts=mig_salts,
            merkle_root=mig_merkle.get_root().hex(),
            onchain_tx_hash="0xmocktxhash222222222222222222222222222222222222222222222222222",
            issued_at=datetime(2021, 6, 1, tzinfo=timezone.utc), # INCONSISTENT DATE
            status="active",
            source_event_id=mig_event.event_id
        )
        db.add(c_mig)
        
        db.commit()
        print("Database successfully seeded with institutions, students, and Emily's inconsistent record.")
        
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
