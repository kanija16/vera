import time
import pytest
from app.services.crypto import (
    generate_ecdsa_keypair,
    sign_message_ecdsa,
    verify_signature_ecdsa,
    generate_hmac_token,
    verify_hmac_token
)

def test_ecdsa_signatures():
    # Key generation
    private_pem, public_pem = generate_ecdsa_keypair()
    assert "PRIVATE KEY" in private_pem
    assert "PUBLIC KEY" in public_pem
    
    # Signing and verification
    message = b"VERA_ACADEMIC_CREDENTIAL_ROOT"
    signature_hex = sign_message_ecdsa(private_pem, message)
    assert len(signature_hex) > 0
    
    assert verify_signature_ecdsa(public_pem, message, signature_hex) == True
    assert verify_signature_ecdsa(public_pem, b"TAMPERED_MESSAGE", signature_hex) == False


def test_hmac_tokens():
    cred_id = "cred-123"
    student_id = "student-456"
    verifier_email = "employer@example.com"
    
    # Valid token test (expiry in future)
    expires_at = time.time() + 60
    token = generate_hmac_token(cred_id, student_id, verifier_email, expires_at)
    assert len(token) > 0
    
    is_valid, payload = verify_hmac_token(token)
    assert is_valid == True
    assert payload["credential_id"] == cred_id
    assert payload["student_id"] == student_id
    assert payload["verifier_email"] == verifier_email
    
    # Expired token test
    expires_now = time.time() - 10
    expired_token = generate_hmac_token(cred_id, student_id, verifier_email, expires_now)
    is_valid_exp, _ = verify_hmac_token(expired_token)
    assert is_valid_exp == False
