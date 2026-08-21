import secrets
from app.merkle import MerkleTreeEngine

def run_test():
    print("Starting Merkle Tree Engine Standalone Unit Test...")
    
    # 1. Define target fields and values
    fields = {
        "student_name": "Alice Smith",
        "cgpa": "9.43",
        "degree": "Bachelor of Technology",
        "graduation_year": "2026",
        "roll_number": "CS-2022-045"
    }
    
    # 2. Generate salts for each field
    salts = {k: secrets.token_hex(16) for k in fields.keys()}
    
    # 3. Initialize engine
    engine = MerkleTreeEngine(fields, salts)
    root = engine.get_root()
    print(f"Computed Merkle Root: {root.hex()}")
    
    # 4. Verify all fields individually
    for key, val in fields.items():
        proof = engine.generate_proof(key)
        print(f"Generated proof for key '{key}' (length {len(proof)})")
        
        # Verify valid proof
        is_valid = MerkleTreeEngine.verify_proof(key, val, salts[key], proof, root)
        assert is_valid, f"Verification failed for valid field: {key}"
        print(f"  [PASS] Valid verification for {key}")
        
        # Verify invalid value fails
        is_valid_bad_val = MerkleTreeEngine.verify_proof(key, "Modified Value", salts[key], proof, root)
        assert not is_valid_bad_val, f"Verification succeeded for invalid value on field: {key}"
        print(f"  [PASS] Tampered value correctly blocked for {key}")
        
        # Verify invalid salt fails
        is_valid_bad_salt = MerkleTreeEngine.verify_proof(key, val, secrets.token_hex(16), proof, root)
        assert not is_valid_bad_salt, f"Verification succeeded for invalid salt on field: {key}"
        print(f"  [PASS] Tampered salt correctly blocked for {key}")
        
    print("All Merkle Tree Engine tests passed successfully! [100% SUCCESS]")

if __name__ == "__main__":
    run_test()
