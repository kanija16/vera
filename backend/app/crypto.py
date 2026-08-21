import os
from eth_account import Account
from eth_account.messages import encode_defunct

# Helper to generate a new Ethereum private key / wallet address pair
def generate_keypair():
    account = Account.create()
    return account.key.hex(), account.address

# Sign a hex hash (e.g. Merkle root) using the institution's private key
def sign_hash(hash_hex: str, private_key: str) -> str:
    # Strip leading 0x if present
    if hash_hex.startswith("0x"):
        hash_hex = hash_hex[2:]
        
    hash_bytes = bytes.fromhex(hash_hex)
    message = encode_defunct(primitive=hash_bytes)
    signed = Account.sign_message(message, private_key=private_key)
    return signed.signature.hex()

# Verify that a signature matches the expected signer address for a given hash
def verify_signature(hash_hex: str, signature_hex: str, expected_address: str) -> bool:
    if hash_hex.startswith("0x"):
        hash_hex = hash_hex[2:]
    if signature_hex.startswith("0x"):
        signature_hex = signature_hex[2:]
        
    hash_bytes = bytes.fromhex(hash_hex)
    message = encode_defunct(primitive=hash_bytes)
    try:
        recovered_address = Account.recover_message(message, signature=bytes.fromhex(signature_hex))
        return recovered_address.lower() == expected_address.lower()
    except Exception as e:
        print(f"Signature verification error: {e}")
        return False
