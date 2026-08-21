import pytest
import pytest_asyncio
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models import Base, Student, Institution, AcademicEvent, EventType, EventStatus
from app.services.validator import ConsistencyAnomalyEngine

DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def db_session():
    # Setup in-memory sqlite engine
    engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    AsyncSessionLocal = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    async with AsyncSessionLocal() as session:
        # Pre-seed institution
        inst = Institution(
            id=uuid.UUID("a1111111-1111-1111-1111-111111111111"),
            name="Test Institution",
            code="TEST-INST",
            public_key="PUBLIC_KEY_PEM",
            is_verified=True
        )
        # Pre-seed student
        student = Student(
            id=uuid.UUID("b1111111-1111-1111-1111-111111111111"),
            name="Alice Smith",
            email="alice.smith@example.com",
            matriculation_no="MAT-2022-001"
        )
        session.add_all([inst, student])
        await session.commit()
        
        yield session
        
    await engine.dispose()


@pytest.mark.asyncio
async def test_timeline_consistency(db_session):
    validator = ConsistencyAnomalyEngine(db_session)
    inst_id = "a1111111-1111-1111-1111-111111111111"
    student_id = "b1111111-1111-1111-1111-111111111111"
    
    # 1. Valid enrollment (2022)
    status, score, errors = await validator.evaluate_event(
        institution_id=inst_id,
        student_id=student_id,
        event_type=EventType.ENROLLMENT.value,
        payload={"matriculation_no": "MAT-2022-001", "program": "B.Tech CSE"},
        event_date=datetime(2022, 9, 1)
    )
    assert status == EventStatus.VALID.value
    assert score == 1.0
    assert len(errors) == 0
    
    # Add enrollment to DB to form student history
    e1 = AcademicEvent(
        institution_id=uuid.UUID(inst_id),
        student_id=uuid.UUID(student_id),
        event_type=EventType.ENROLLMENT.value,
        payload={"matriculation_no": "MAT-2022-001", "program": "B.Tech CSE"},
        trust_score=score,
        status=status,
        created_at=datetime(2022, 9, 1)
    )
    db_session.add(e1)
    await db_session.commit()
    
    # 2. Inconsistent migration dated 2021 (before enrollment)
    status_mig, score_mig, errors_mig = await validator.evaluate_event(
        institution_id=inst_id,
        student_id=student_id,
        event_type=EventType.MIGRATION_REQ.value,
        payload={"matriculation_no": "MAT-2022-001", "destination": "Abroad"},
        event_date=datetime(2021, 6, 1)
    )
    assert status_mig == EventStatus.SUSPICIOUS_REVIEW.value
    assert score_mig < 0.85
    assert any("TIMELINE_INCONSISTENCY" in err for err in errors_mig)
