from app.crypto import generate_keypair, sign_hash, verify_signature

def run_test():
    print("Starting Cryptographic Signing Unit Test...")
    
    # 1. Generate keypair for institution
    priv_key, pub_address = generate_keypair()
    print(f"Generated Keypair:")
    print(f"  Private Key: {priv_key}")
    print(f"  Public Address: {pub_address}")
    
    # 2. Define a mock Merkle Root hash
    merkle_root = "e5278ad0065cd1c6fdc86b4980a7fa0f7abf1e3542c1f44b46f15fa81c725be6"
    
    # 3. Sign the hash
    sig = sign_hash(merkle_root, priv_key)
    print(f"Signature (hex): {sig}")
    
    # 4. Verify valid signature
    is_valid = verify_signature(merkle_root, sig, pub_address)
    assert is_valid, "Failed to verify valid signature!"
    print("  [PASS] Successfully verified valid signature.")
    
    # 5. Verify tampered signature fails
    is_valid_bad_sig = verify_signature(merkle_root, sig[:-5] + "00000", pub_address)
    assert not is_valid_bad_sig, "Succeeded in verifying tampered signature!"
    print("  [PASS] Tampered signature correctly rejected.")
    
    # 6. Verify incorrect address fails
    is_valid_bad_addr = verify_signature(merkle_root, sig, "0x0000000000000000000000000000000000000000")
    assert not is_valid_bad_addr, "Succeeded in verifying against incorrect address!"
    print("  [PASS] Signature verified against incorrect address correctly rejected.")
    
    # 7. Verify incorrect hash fails
    is_valid_bad_hash = verify_signature("a" * 64, sig, pub_address)
    assert not is_valid_bad_hash, "Succeeded in verifying signature against different hash!"
    print("  [PASS] Signature verified against tampered hash correctly rejected.")
    
    print("Cryptographic Signing Unit Test Passed! [100% SUCCESS]")

if __name__ == "__main__":
    run_test()
