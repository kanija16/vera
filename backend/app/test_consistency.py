import os
import uuid
from datetime import datetime, timezone
# Set DATABASE_URL to a local sqlite file for standalone testing
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

from app.database import engine, SessionLocal
from app.seed import seed_db
from app.consistency import AcademicConsistencyEngine
from app.models import Student

def run_test():
    print("Starting Consistency Engine Standalone Unit Test...")
    
    # 1. Clean up old test database if exists
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
            print("Removed old test.db")
        except Exception as e:
            print(f"Could not remove old test.db: {e}")
        
    # 2. Seed database (this will create tables and insert data)
    seed_db()
    
    # 3. Create database session
    db = SessionLocal()
    try:
        # Get Emily White
        emily = db.query(Student).filter(Student.full_name == "Emily White").first()
        assert emily is not None, "Emily White not found in database!"
        print(f"Found student Emily White with ID: {emily.student_id}")
        
        # 4. Instantiate Academic Consistency Engine
        engine_instance = AcademicConsistencyEngine(db)
        
        # 5. Get her credentials/records history
        records = engine_instance.get_credentials_for_student(str(emily.student_id))
        print("Emily's academic records in system:")
        for r in records:
            print(f"  - Type: {r['type']}, Date: {r['issuanceDate']}")
            
        # 6. Evaluate a NEW Migration Certificate that is dated in the past
        new_migration_cred = {
            "type": "MigrationCertificate",
            "issuanceDate": datetime(2021, 6, 1, tzinfo=timezone.utc).isoformat()
        }
        
        is_consistent, errors = engine_instance.evaluate_new_credential(str(emily.student_id), new_migration_cred)
        
        print(f"Consistency check result: {is_consistent}")
        print(f"Errors flagged: {errors}")
        
        # We expect a timeline inconsistency because 2021-06-01 is BEFORE her admission on 2022-09-01
        assert not is_consistent, "Consistency engine failed to catch the timeline anomaly!"
        assert len(errors) > 0, "No errors were returned!"
        assert "TIMELINE_INCONSISTENCY" in errors[0], f"Unexpected error message: {errors[0]}"
        
        print("Consistency Engine Unit Test Passed successfully! [100% SUCCESS]")
        
    finally:
        db.close()
        # Explicitly dispose engine to release SQLite locks
        engine.dispose()
        # Clean up database file after test
        if os.path.exists("./test.db"):
            try:
                os.remove("./test.db")
                print("Cleaned up test.db")
            except Exception as e:
                print(f"Could not clean up test.db: {e}")

if __name__ == "__main__":
    run_test()
