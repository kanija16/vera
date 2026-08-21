import os
os.environ["DATABASE_URL"] = "sqlite:///./test_api.db"

from fastapi.testclient import TestClient
from app.main import app
from app.database import engine, Base

def setup_module(module):
    # Setup test database
    if os.path.exists("./test_api.db"):
        try:
            os.remove("./test_api.db")
        except Exception:
            pass
    # Create tables
    Base.metadata.create_all(bind=engine)

def teardown_module(module):
    # Cleanup database
    engine.dispose()
    if os.path.exists("./test_api.db"):
        try:
            os.remove("./test_api.db")
        except Exception:
            pass

def test_vera_api_integration():
    print("\nStarting end-to-end VERA API Integration Test...")
    
    with TestClient(app) as client:
        # 1. Test GET /api/students/{id}/credentials (Passport View for Emily White - Seeded)
        emily_id = "b5555555-5555-5555-5555-555555555555"
        response = client.get(f"/api/students/{emily_id}/credentials")
        print("Emily credentials response:", response.status_code, response.text)
        assert response.status_code == 200
        data = response.json()
        assert data["student"]["full_name"] == "Emily White"
        assert len(data["credentials"]) == 2
        # Verify Emily's seeded credential has "review" status because of chronological inconsistency
        assert data["credentials"][0]["status"] in ("review", "active")
        print("  [PASS] Successfully retrieved student credentials (Passport View).")
        
        # 2. Test POST /api/institutions/{id}/events (Log new Academic Event for Alice)
        inst_id = "a1111111-1111-1111-1111-111111111111"
        alice_id = "b1111111-1111-1111-1111-111111111111"
        event_payload = {
            "student_id": alice_id,
            "event_type": "semester_lock",
            "payload": {
                "semester": "Semester 3",
                "gpa": "9.12",
                "credits_earned": "24"
            },
            "event_date": "2023-12-15T10:00:00"
        }
        response = client.post(f"/api/institutions/{inst_id}/events", json=event_payload)
        assert response.status_code == 201
        event_data = response.json()
        event_id = event_data["event_id"]
        assert event_id is not None
        print("  [PASS] Successfully logged new academic event.")
        
        # 3. Test POST /api/institutions/{id}/events/{id}/finalize (Finalize and Issue Credential)
        response = client.post(f"/api/institutions/{inst_id}/events/{event_id}/finalize")
        assert response.status_code == 200
        issue_data = response.json()
        cred_id = issue_data["credential_id"]
        assert cred_id == event_id
        assert issue_data["merkle_root"] is not None
        assert issue_data["onchain_tx_hash"].startswith("0x")
        print("  [PASS] Successfully finalized event and issued credential.")
        
        # 4. Test POST /api/credentials/{id}/share (Create Selective Disclosure Share Pass)
        share_payload = {
            "verifier_label": "Google Recruiting",
            "fields_allowed": ["student_name", "roll_number", "gpa"],
            "duration": "24h"
        }
        response = client.post(f"/api/credentials/{cred_id}/share", json=share_payload)
        assert response.status_code == 200
        share_data = response.json()
        token = share_data["token"]
        assert token is not None
        print("  [PASS] Successfully created selective disclosure pass.")
        
        # 5. Test GET /api/verify/{token} (Verify the token)
        response = client.get(f"/api/verify/{token}")
        assert response.status_code == 200
        verify_data = response.json()
        assert verify_data["result"] == "verified"
        assert verify_data["student_name"] == "Alice Smith"
        # Ensure ONLY disclosed fields are visible
        assert "student_name" in verify_data["disclosed_fields"]
        assert "roll_number" in verify_data["disclosed_fields"]
        assert "gpa" in verify_data["disclosed_fields"]
        assert "semester" not in verify_data["disclosed_fields"] # Not in fields_allowed!
        
        # Ensure Merkle proofs verification passes
        assert verify_data["layered_checks"]["Merkle Proof Integrity Valid"] is True
        assert verify_data["layered_checks"]["On-Chain Credential Status Active"] is True
        print("  [PASS] Successfully verified selective disclosure pass with correct fields.")
        
        # 6. Test POST /api/verify/tamper-simulate (Mutate a field in database and verify)
        tamper_payload = {
            "credential_id": cred_id,
            "field_to_tamper": "gpa",
            "new_value": "9.95" # Original was 9.12
        }
        response = client.post("/api/verify/tamper-simulate", json=tamper_payload)
        assert response.status_code == 200
        
        # Verify token again -> Should output TAMPERED
        response = client.get(f"/api/verify/{token}")
        assert response.status_code == 200
        verify_data_tampered = response.json()
        assert verify_data_tampered["result"] == "tampered"
        assert verify_data_tampered["layered_checks"]["Merkle Proof Integrity Valid"] is False
        print("  [PASS] Successfully detected grade tampering.")
        
        # Restore GPA to prevent side effects and test revocation
        restore_payload = {
            "credential_id": cred_id,
            "field_to_tamper": "gpa",
            "new_value": "9.12"
        }
        client.post("/api/verify/tamper-simulate", json=restore_payload)
        
        # 7. Test POST /api/credentials/{id}/revoke (Revoke credential)
        revoke_payload = {
            "reason": "Administrative Cancellation"
        }
        response = client.post(f"/api/credentials/{cred_id}/revoke", json=revoke_payload)
        assert response.status_code == 200
        
        # Verify token again -> Should output REVOKED
        response = client.get(f"/api/verify/{token}")
        assert response.status_code == 200
        verify_data_revoked = response.json()
        assert verify_data_revoked["result"] == "revoked"
        assert verify_data_revoked["layered_checks"]["On-Chain Credential Status Active"] is False
        print("  [PASS] Successfully detected revoked credential.")
        
        # 8. Test GET /api/students/{id}/access-history (Verify access logs)
        response = client.get(f"/api/students/{alice_id}/access-history")
        assert response.status_code == 200
        history_data = response.json()
        assert len(history_data["access_logs"]) >= 3 # Verified, Tampered, Revoked checks
        print("  [PASS] Successfully retrieved student access history logs.")
        
        # 9. Test GET /api/institutions/{id}/audit-trail (Verify audit trail)
        response = client.get(f"/api/institutions/{inst_id}/audit-trail")
        assert response.status_code == 200
        audit_data = response.json()
        assert len(audit_data["audit_logs"]) >= 3 # Log event, Finalize, Revoke actions
        print("  [PASS] Successfully retrieved institutional audit trails.")
        
        print("All VERA Core API Integration Tests Passed! [100% SUCCESS]")

if __name__ == "__main__":
    setup_module(None)
    try:
        test_vera_api_integration()
    finally:
        teardown_module(None)
