import os
import asyncio
import uuid
import secrets
import hashlib
from datetime import datetime
from sqlalchemy.future import select
from app.database import engine, AsyncSessionLocal, bootstrap_database
from app.models import Base, Institution, Student, AcademicEvent, Credential, EventType, EventStatus, CredentialStatus
from app.services.crypto import build_merkle_tree, generate_ecdsa_keypair, canonicalize_json
from app.services.blockchain import BlockchainLedgerSimulator

async def seed_db():
    print("[SEED] Starting database seeding...")
    async with AsyncSessionLocal() as db:
        # 1. Seed Institution (VERA Institute of Technology)
        inst_stmt = select(Institution).filter(Institution.code == "VERA-TECH")
        inst_res = await db.execute(inst_stmt)
        inst = inst_res.scalar_one_or_none()
        if not inst:
            private_key, public_key = generate_ecdsa_keypair()
            inst = Institution(
                id=uuid.UUID("a1111111-1111-1111-1111-111111111111"),
                name="VERA Institute of Technology",
                code="VERA-TECH",
                public_key=public_key,
                is_verified=True,
                created_at=datetime(2022, 1, 1)
            )
            db.add(inst)
            await db.commit()
            await db.refresh(inst)
            print("[SEED] Seeded VERA Institute of Technology.")
        else:
            print("[SEED] VERA Institute of Technology already exists.")

        # 2. Seed Student Alice Smith (Consistent student)
        alice_stmt = select(Student).filter(Student.email == "alice.smith@example.com")
        alice_res = await db.execute(alice_stmt)
        alice = alice_res.scalar_one_or_none()
        if not alice:
            alice = Student(
                id=uuid.UUID("b1111111-1111-1111-1111-111111111111"),
                name="Alice Smith",
                email="alice.smith@example.com",
                matriculation_no="MAT-2022-001",
                wallet_address="0x3333333333333333333333333333333333333333"
            )
            db.add(alice)
            await db.commit()
            await db.refresh(alice)
            print("[SEED] Seeded student Alice Smith.")
            
            # Add Alice events
            # Event 1: Enrollment
            e1 = AcademicEvent(
                id=uuid.UUID("c1111111-1111-1111-1111-222222222221"),
                institution_id=inst.id,
                student_id=alice.id,
                event_type=EventType.ENROLLMENT.value,
                payload={"matriculation_no": "MAT-2022-001", "program": "B.Tech CSE"},
                trust_score=1.0,
                status=EventStatus.VALID.value,
                created_at=datetime(2022, 9, 1)
            )
            db.add(e1)
            
            # Event 2: Semester Final
            e2 = AcademicEvent(
                id=uuid.UUID("c1111111-1111-1111-1111-222222222222"),
                institution_id=inst.id,
                student_id=alice.id,
                event_type=EventType.SEMESTER_FINAL.value,
                payload={"matriculation_no": "MAT-2022-001", "semester": "Semester 1", "gpa": "9.43", "credits": "20"},
                trust_score=1.0,
                status=EventStatus.VALID.value,
                created_at=datetime(2023, 1, 20)
            )
            db.add(e2)
            
            # Event 3: Degree Award
            e3 = AcademicEvent(
                id=uuid.UUID("c1111111-1111-1111-1111-222222222223"),
                institution_id=inst.id,
                student_id=alice.id,
                event_type=EventType.DEGREE_AWARD.value,
                payload={"matriculation_no": "MAT-2022-001", "degree": "B.Tech Computer Science", "cgpa": "9.43", "graduation_year": "2026"},
                trust_score=1.0,
                status=EventStatus.VALID.value,
                created_at=datetime(2026, 6, 15)
            )
            db.add(e3)
            await db.commit()
            
            # Generate credentials for Alice
            for event in [e1, e2, e3]:
                # Generate salts
                salts = {k: secrets.token_hex(16) for k in event.payload.keys()}
                leaf_hashes, merkle_root = build_merkle_tree(event.payload, salts)
                
                # Anchor
                BlockchainLedgerSimulator.anchor_credential(
                    credential_id=str(event.id),
                    merkle_root=merkle_root,
                    institution_id=str(inst.id)
                )
                
                # Save Credential
                c = Credential(
                    id=event.id,
                    event_id=event.id,
                    student_id=alice.id,
                    merkle_root=merkle_root,
                    canonical_payload_hash=hashlib.sha256(canonicalize_json(event.payload)).hexdigest(),
                    salts=salts,
                    status=CredentialStatus.ACTIVE.value,
                    version=1,
                    created_at=datetime.utcnow()
                )
                db.add(c)
            await db.commit()
            print("[SEED] Seeded Alice Smith credentials.")
        else:
            print("[SEED] Student Alice Smith already exists.")

        # 3. Seed Student Emily White (Inconsistent student)
        emily_stmt = select(Student).filter(Student.email == "emily.white@example.com")
        emily_res = await db.execute(emily_stmt)
        emily = emily_res.scalar_one_or_none()
        if not emily:
            emily = Student(
                id=uuid.UUID("b5555555-5555-5555-5555-555555555555"),
                name="Emily White",
                email="emily.white@example.com",
                matriculation_no="MAT-2022-005",
                wallet_address="0x7777777777777777777777777777777777777777"
            )
            db.add(emily)
            await db.commit()
            await db.refresh(emily)
            print("[SEED] Seeded student Emily White.")
            
            # Event 1: Enrollment
            e_emily_1 = AcademicEvent(
                id=uuid.UUID("c1111111-1111-1111-1111-111111111111"),
                institution_id=inst.id,
                student_id=emily.id,
                event_type=EventType.ENROLLMENT.value,
                payload={"matriculation_no": "MAT-2022-005", "program": "B.Tech CSE"},
                trust_score=1.0,
                status=EventStatus.VALID.value,
                created_at=datetime(2022, 9, 1)
            )
            db.add(e_emily_1)
            
            # Event 2: Migration request (Inconsistent: dated 2021-06-01)
            e_emily_2 = AcademicEvent(
                id=uuid.UUID("c3333333-3333-3333-3333-333333333333"),
                institution_id=inst.id,
                student_id=emily.id,
                event_type=EventType.MIGRATION_REQ.value,
                payload={"matriculation_no": "MAT-2022-005", "destination": "Foreign Tech", "reason": "Transfer"},
                trust_score=0.5,
                status=EventStatus.SUSPICIOUS_REVIEW.value,
                created_at=datetime(2021, 6, 1)
            )
            db.add(e_emily_2)
            await db.commit()
            
            # Generate credentials for Emily White's Valid events only
            salts = {k: secrets.token_hex(16) for k in e_emily_1.payload.keys()}
            leaf_hashes, merkle_root = build_merkle_tree(e_emily_1.payload, salts)
            BlockchainLedgerSimulator.anchor_credential(
                credential_id=str(e_emily_1.id),
                merkle_root=merkle_root,
                institution_id=str(inst.id)
            )
            c_emily_1 = Credential(
                id=e_emily_1.id,
                event_id=e_emily_1.id,
                student_id=emily.id,
                merkle_root=merkle_root,
                canonical_payload_hash=hashlib.sha256(canonicalize_json(e_emily_1.payload)).hexdigest(),
                salts=salts,
                status=CredentialStatus.ACTIVE.value,
                version=1,
                created_at=datetime.utcnow()
            )
            db.add(c_emily_1)
            await db.commit()
            print("[SEED] Seeded Emily White credentials.")
        else:
            print("[SEED] Student Emily White already exists.")

    print("[SEED] Database seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_db())
