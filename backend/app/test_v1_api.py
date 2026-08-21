import os
import uuid
import time
# Override DATABASE_URL for test isolation
os.environ["DATABASE_URL"] = "sqlite:///./test_v1_api.db"

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine
from app.models import Base
from app.services.blockchain import BlockchainLedgerSimulator

def setup_module(module):
    # Reset test database file
    if os.path.exists("./test_v1_api.db"):
        try:
            os.remove("./test_v1_api.db")
        except Exception:
            pass
    BlockchainLedgerSimulator.clear_ledger()

def teardown_module(module):
    engine.dispose()
    if os.path.exists("./test_v1_api.db"):
        try:
            os.remove("./test_v1_api.db")
        except Exception:
            pass
    BlockchainLedgerSimulator.clear_ledger()

def test_cryptographic_academic_trust_flow():
    print("\nStarting VERA Cryptographic System Architecture Integration Tests...")
    
    with TestClient(app) as client:
        # Define Seed IDs matching seed_emily_white
        inst_id = "a1111111-1111-1111-1111-111111111111"
        emily_id = "b5555555-5555-5555-5555-555555555555"
        
        # -------------------------------------------------------------
        # TEST 1: Retrieve Emily White's Seeded Credentials (Verification checklist)
        # -------------------------------------------------------------
        # Note: Emily's migration req event (2021) predates enrollment (2022).
        # We did not finalize it in seed logic yet, but we will ingest a new valid event for Alice
        # and test the validator anomaly engine.
        print("TEST 1: Seed verification checking...")
        
        # Let's seed a new student "Alice Smith" and verify happy path
        # First we need to create the student Alice in DB.
        # Since we want to test ingestion, let's create a verified institution first
        # Wait, Amrita University is already seeded as inst_id.
        # Let's create Alice Smith in the database. To do that, we need an endpoint or we can create it.
        # Wait! How can we insert Alice Smith? We can add a student or query existing.
        # Let's check: we can use a helper or write a quick endpoint to seed/create a student,
        # OR we can register Alice. Let's see: we can query Emily White who is already seeded!
        # Emily White exists! Let's query Emily White's credentials first:
        response = client.get(f"/api/v1/students/{emily_id}/credentials")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Emily White"
        assert len(data["credentials"]) == 0 # None finalized yet!
        print("  [PASS] Successfully verified seeded Emily White student record.")

        # -------------------------------------------------------------
        # TEST 2: Ingest Valid Event (Happy Path)
        # -------------------------------------------------------------
        # Event: Semester 1 final for Emily White
        # Date: 2023-06-01 (Strictly after enrollment 2022-09-01)
        print("TEST 2: Ingesting valid Semester Final event...")
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
        print("  [PASS] Successfully ingested valid event and received VALID status.")

        # -------------------------------------------------------------
        # TEST 3: Ingest Inconsistent Event (Timeline Contradiction / Anomaly Detection)
        # -------------------------------------------------------------
        # Event: Enrollment date post-dating degree award (or migration pre-dating enrollment)
        # We will create a migration record dated 2021-01-01 for Emily
        print("TEST 3: Ingesting inconsistent timeline event (Anomaly Check)...")
        inconsistent_payload = {
            "student_id": emily_id,
            "event_type": "MIGRATION_REQ",
            "payload": {
                "matriculation_no": "MAT-2022-005",
                "destination": "Out-of-state Univ",
                "reason": "Transfer"
            },
            "event_date": "2021-01-01T10:00:00" # Prior to enrollment!
        }
        response = client.post(f"/api/v1/institutions/{inst_id}/events", json=inconsistent_payload)
        assert response.status_code == 201
        res_data = response.json()
        assert res_data["status"] == "SUSPICIOUS_REVIEW"
        assert res_data["trust_score"] < 0.85
        assert any("TIMELINE_INCONSISTENCY" in err for err in res_data["errors"])
        print("  [PASS] Successfully caught temporal inconsistency and flagged SUSPICIOUS_REVIEW.")

        # -------------------------------------------------------------
        # TEST 4: Finalize & Anchor Valid Event
        # -------------------------------------------------------------
        print("TEST 4: Finalizing VALID event and anchoring to simulated ledger...")
        response = client.post(f"/api/v1/institutions/{inst_id}/events/{event_id}/finalize")
        assert response.status_code == 200
        fin_data = response.json()
        assert fin_data["credential_id"] == event_id
        assert fin_data["status"] == "ACTIVE"
        assert fin_data["merkle_root"] is not None
        assert fin_data["blockchain_tx"]["merkle_root"] == fin_data["merkle_root"]
        print("  [PASS] Successfully finalized credential and anchored Merkle Root on-chain.")

        # -------------------------------------------------------------
        # TEST 5: Share Permission & Verify HMAC token
        # -------------------------------------------------------------
        print("TEST 5: Creating permission token & verifying access...")
        share_payload = {
            "verifier_email": "recruiter@techcorp.com",
            "expires_in_seconds": 3600
        }
        response = client.post(f"/api/v1/credentials/{event_id}/share", json=share_payload)
        assert response.status_code == 200
        share_res = response.json()
        access_token = share_res["access_token"]
        assert access_token is not None
        
        # Verify the access token
        response = client.get(f"/api/v1/verify/{access_token}")
        assert response.status_code == 200
        verify_data = response.json()
        assert verify_data["status"] == "AUTHENTIC"
        assert verify_data["student_name"] == "Emily White"
        assert verify_data["payload"]["semester"] == "Semester 2"
        assert verify_data["checks"]["Off-Chain Payload Match On-Chain Merkle Root"] is True
        print("  [PASS] Cryptographic verification checks succeeded for shared token.")

        # -------------------------------------------------------------
        # TEST 6: Simulate Database Tampering (Grade modification)
        # -------------------------------------------------------------
        print("TEST 6: Simulating off-chain grade tampering...")
        tamper_payload = {
            "credential_id": event_id,
            "field_name": "gpa",
            "new_value": "9.95" # Original was 8.90
        }
        response = client.post("/api/v1/verify/tamper-simulate", json=tamper_payload)
        assert response.status_code == 200
        
        # Subsequent verify call MUST return 409 Conflict: TAMPERING_DETECTED
        response = client.get(f"/api/v1/verify/{access_token}")
        assert response.status_code == 409
        assert "TAMPERING_DETECTED" in response.json()["detail"]
        print("  [PASS] Successfully blocked verification and returned 409 TAMPERING_DETECTED.")

        # Restore GPA to check revocation
        restore_payload = {
            "credential_id": event_id,
            "field_name": "gpa",
            "new_value": "8.90"
        }
        client.post("/api/v1/verify/tamper-simulate", json=restore_payload)

        # -------------------------------------------------------------
        # TEST 7: Invalidation / Revocation On-Chain
        # -------------------------------------------------------------
        print("TEST 7: Revoking credential status on-chain...")
        response = client.post(f"/api/v1/credentials/{event_id}/revoke")
        assert response.status_code == 200
        
        # Verify call should now return status: REVOKED
        response = client.get(f"/api/v1/verify/{access_token}")
        assert response.status_code == 200
        verify_revoked = response.json()
        assert verify_revoked["status"] == "REVOKED"
        assert verify_revoked["checks"]["On-Chain Credential Status Active"] is False
        print("  [PASS] Successfully verified REVOKED state on-chain.")
        
        print("\nAll VERA Cryptographic System Architecture tests passed! [100% SUCCESS]")

if __name__ == "__main__":
    setup_module(None)
    try:
        test_cryptographic_academic_trust_flow()
    finally:
        teardown_module(None)
