import os
# Set environment overrides at the absolute top of the module before any imports
os.environ["DATABASE_URL"] = "sqlite:///./test_v1_api.db"
os.environ["DB_FORCE_BOOTSTRAP"] = "false"

import uuid
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, bootstrap_database
from app.models import Base
from app.services.blockchain import BlockchainLedgerSimulator

@pytest.fixture(scope="module", autouse=True)
def setup_teardown():
    # Setup
    if os.path.exists("./test_v1_api.db"):
        try:
            os.remove("./test_v1_api.db")
        except Exception:
            pass
    BlockchainLedgerSimulator.clear_ledger()
    
    # Run DB creation
    import asyncio
    asyncio.run(bootstrap_database(engine, force=True))
    
    # Pre-seed the DB using seed script
    from app.seed import seed_db
    asyncio.run(seed_db())
    
    yield
    
    # Teardown
    engine.dispose()
    if os.path.exists("./test_v1_api.db"):
        try:
            os.remove("./test_v1_api.db")
        except Exception:
            pass
    BlockchainLedgerSimulator.clear_ledger()


def test_cryptographic_academic_trust_flow():
    with TestClient(app) as client:
        inst_id = "a1111111-1111-1111-1111-111111111111"
        emily_id = "b5555555-5555-5555-5555-555555555555"
        
        # TEST 1: Retrieve Emily White's Seeded Credentials
        response = client.get(f"/api/v1/students/{emily_id}/credentials")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Emily White"
        
        # TEST 2: Ingest Valid Event (Happy Path)
        event_payload = {
            "student_id": emily_id,
            "event_type": "SEMESTER_FINAL",
            "payload": {
                "matriculation_no": "MAT-2022-005",
                "semester": "Semester 2",
                "gpa": "8.90",
                "credits": "20"
            },
            "event_date": "2023-06-01T09:00:00"
        }
        response = client.post(f"/api/v1/institutions/{inst_id}/events", json=event_payload)
        assert response.status_code == 201
        res_data = response.json()
        event_id = res_data["id"]
        assert res_data["status"] == "VALID"
        assert res_data["trust_score"] >= 0.85
        assert len(res_data["errors"]) == 0
        
        # TEST 3: Ingest Inconsistent Event (Timeline Contradiction)
        inconsistent_payload = {
            "student_id": emily_id,
            "event_type": "MIGRATION_REQ",
            "payload": {
                "matriculation_no": "MAT-2022-005",
                "destination": "Out-of-state Univ",
                "reason": "Transfer"
            },
            "event_date": "2021-01-01T10:00:00"
        }
        response = client.post(f"/api/v1/institutions/{inst_id}/events", json=inconsistent_payload)
        assert response.status_code == 201
        res_data = response.json()
        assert res_data["status"] == "SUSPICIOUS_REVIEW"
        assert res_data["trust_score"] < 0.85
        assert any("TIMELINE_INCONSISTENCY" in err for err in res_data["errors"])
        
        # TEST 4: Finalize & Anchor Valid Event
        response = client.post(f"/api/v1/institutions/{inst_id}/events/{event_id}/finalize")
        assert response.status_code == 200
        fin_data = response.json()
        assert fin_data["credential_id"] == event_id
        assert fin_data["status"] == "ACTIVE"
        assert fin_data["merkle_root"] is not None
        assert fin_data["blockchain_tx"]["merkle_root"] == fin_data["merkle_root"]
        
        # TEST 5: Share Permission & Verify with selective disclosure list
        share_payload = {
            "verifier_email": "recruiter@techcorp.com",
            "expires_in_seconds": 3600,
            "fields_allowed": ["semester", "gpa"]
        }
        response = client.post(f"/api/v1/credentials/{event_id}/share", json=share_payload)
        assert response.status_code == 200
        share_res = response.json()
        access_token = share_res["access_token"]
        assert access_token is not None
        
        # Verify the access token (should only return name, matric, semester, gpa)
        response = client.get(f"/api/v1/verify/{access_token}")
        assert response.status_code == 200
        verify_data = response.json()
        assert verify_data["status"] == "AUTHENTIC"
        assert verify_data["student_name"] == "Emily White"
        assert "semester" in verify_data["payload"]
        assert "gpa" in verify_data["payload"]
        assert "credits" not in verify_data["payload"]  # Omitted!
        assert verify_data["checks"]["Off-Chain Payload Match On-Chain Merkle Root"] is True
        
        # Verify using Salted Merkle proof locally
        from app.services.crypto import verify_merkle_proof
        for k, v in verify_data["payload"].items():
            salt = verify_data["salts"][k]
            proof = verify_data["merkle_proofs"][k]
            assert verify_merkle_proof(k, v, salt, proof, verify_data["merkle_root"]) is True
            
        # TEST 6: Simulate Database Tampering (Grade modification)
        tamper_payload = {
            "credential_id": event_id,
            "field_name": "gpa",
            "new_value": "9.95"
        }
        response = client.post("/api/v1/demo/tamper", json=tamper_payload)
        assert response.status_code == 200
        
        # Verify call MUST return 409 Conflict: TAMPERING_DETECTED
        response = client.get(f"/api/v1/verify/{access_token}")
        assert response.status_code == 409
        
        # Restore GPA to check subsequent operations
        restore_payload = {
            "credential_id": event_id,
            "field_name": "gpa",
            "new_value": "8.90"
        }
        client.post("/api/v1/demo/tamper", json=restore_payload)
        
        # TEST 7: Revoke Access manually (Student)
        # Create a new share pass
        response = client.post(f"/api/v1/credentials/{event_id}/share", json=share_payload)
        assert response.status_code == 200
        new_token = response.json()["access_token"]
        new_perm_id = response.json()["permission_id"]
        
        # Revoke it
        response = client.post(f"/api/v1/permissions/{new_perm_id}/revoke")
        assert response.status_code == 200
        
        # Verify call should fail with 401 Unauthorized
        response = client.get(f"/api/v1/verify/{new_token}")
        assert response.status_code == 401

        # TEST 8: Invalidation / Revocation On-Chain
        response = client.post(f"/api/v1/credentials/{event_id}/revoke")
        assert response.status_code == 200
        
        # Verify call should now return status: REVOKED
        response = client.get(f"/api/v1/verify/{access_token}")
        assert response.status_code == 200
        verify_revoked = response.json()
        assert verify_revoked["status"] == "REVOKED"
        assert verify_revoked["checks"]["On-Chain Credential Status Active"] is False
