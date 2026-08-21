import secrets
import pytest
from app.services.crypto import build_merkle_tree, generate_merkle_proof, verify_merkle_proof

def test_salted_merkle_tree():
    # 1. Define fields and generate unique salts
    fields = {
        "student_name": "Alice Smith",
        "cgpa": "9.43",
        "degree": "Bachelor of Technology",
        "graduation_year": "2026",
        "roll_number": "CS-2022-045"
    }
    salts = {k: secrets.token_hex(16) for k in fields.keys()}
    
    # 2. Build root
    leaf_hashes, root = build_merkle_tree(fields, salts)
    assert len(leaf_hashes) == 5
    assert len(root) == 64  # Hex string
    
    # 3. Test verification for all fields
    for k, v in fields.items():
        proof = generate_merkle_proof(fields, salts, k)
        assert len(proof) > 0
        
        # Verify valid proof
        assert verify_merkle_proof(k, v, salts[k], proof, root) == True
        
        # Verify tampered value fails
        assert verify_merkle_proof(k, "Modified Value", salts[k], proof, root) == False
        
        # Verify tampered salt fails
        assert verify_merkle_proof(k, v, secrets.token_hex(16), proof, root) == False
