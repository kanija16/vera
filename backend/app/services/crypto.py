import os
import hmac
import base64
import hashlib
import json
import time
from typing import List, Tuple, Dict, Any
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes, serialization

SECRET_KEY = os.getenv("SECRET_KEY", "vera_cryptographic_secret_key_2026")

# 1. Canonicalization (lexicographical sorting of JSON keys)
def canonicalize_json(payload: Dict[str, Any]) -> bytes:
    return json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')

# 2. Balanced binary Merkle Tree builder
def build_merkle_tree(payload: Dict[str, Any]) -> Tuple[List[str], str]:
    # Sort keys to ensure deterministic ordering of fields
    sorted_keys = sorted(payload.keys())
    
    # Generate leaf hashes: sha256("key:value")
    leaf_hashes = []
    for k in sorted_keys:
        val = payload[k]
        leaf_content = f"{k}:{val}".encode('utf-8')
        leaf_hash = hashlib.sha256(leaf_content).hexdigest()
        leaf_hashes.append(leaf_hash)
        
    if not leaf_hashes:
        return [], ""
        
    current_layer = [bytes.fromhex(lh) for lh in leaf_hashes]
    
    # Build tree layers sequentially
    while len(current_layer) > 1:
        next_layer = []
        for i in range(0, len(current_layer), 2):
            left = current_layer[i]
            if i + 1 < len(current_layer):
                right = current_layer[i+1]
            else:
                # Balanced tree: duplicate the odd node
                right = left
            combined = hashlib.sha256(left + right).digest()
            next_layer.append(combined)
        current_layer = next_layer
        
    return leaf_hashes, current_layer[0].hex()

# 3. Generate Merkle Proof for a specific field
def generate_merkle_proof(payload: Dict[str, Any], target_key: str) -> List[Dict[str, str]]:
    sorted_keys = sorted(payload.keys())
    if target_key not in sorted_keys:
        return []
        
    idx = sorted_keys.index(target_key)
    leaf_hashes = [hashlib.sha256(f"{k}:{payload[k]}".encode('utf-8')).digest() for k in sorted_keys]
    
    tree = [leaf_hashes]
    current_layer = leaf_hashes
    
    while len(current_layer) > 1:
        next_layer = []
        for i in range(0, len(current_layer), 2):
            left = current_layer[i]
            right = current_layer[i+1] if i + 1 < len(current_layer) else left
            next_layer.append(hashlib.sha256(left + right).digest())
        tree.append(next_layer)
        current_layer = next_layer
        
    proof = []
    for layer_idx in range(len(tree) - 1):
        layer = tree[layer_idx]
        if len(layer) % 2 != 0:
            layer = layer + [layer[-1]]
        is_right = (idx % 2 == 1)
        sibling_idx = idx - 1 if is_right else idx + 1
        proof.append({
            "position": "left" if is_right else "right",
            "hash": layer[sibling_idx].hex()
        })
        idx //= 2
        
    return proof

# 4. Verify Merkle Proof
def verify_merkle_proof(target_key: str, target_value: str, proof: List[Dict[str, str]], root_hex: str) -> bool:
    leaf_content = f"{target_key}:{target_value}".encode('utf-8')
    current_hash = hashlib.sha256(leaf_content).digest()
    
    for node in proof:
        sibling = bytes.fromhex(node["hash"])
        if node["position"] == "left":
            current_hash = hashlib.sha256(sibling + current_hash).digest()
        else:
            current_hash = hashlib.sha256(current_hash + sibling).digest()
            
    return current_hash.hex() == root_hex

# 5. HMAC Access Token Generator
def generate_hmac_token(credential_id: str, student_id: str, verifier_email: str, expires_at: float) -> str:
    payload_str = f"{credential_id}:{student_id}:{verifier_email}:{expires_at}"
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()
    
    payload_b64 = base64.urlsafe_b64encode(payload_str.encode('utf-8')).decode('utf-8').rstrip("=")
    return f"{payload_b64}.{signature}"

# 6. Verify HMAC Access Token
def verify_hmac_token(token: str) -> Tuple[bool, Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return False, {}
            
        payload_b64, signature = parts
        # Restore padding
        padding = 4 - (len(payload_b64) % 4)
        decoded_bytes = base64.urlsafe_b64decode(payload_b64 + "=" * padding)
        payload_str = decoded_bytes.decode('utf-8')
        
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected_sig, signature):
            return False, {}
            
        credential_id, student_id, verifier_email, expires_at_str = payload_str.split(":")
        expires_at = float(expires_at_str)
        
        # Check expiration time
        if time.time() > expires_at:
            return False, {}
            
        return True, {
            "credential_id": credential_id,
            "student_id": student_id,
            "verifier_email": verifier_email,
            "expires_at": expires_at
        }
    except Exception:
        return False, {}

# 7. ECDSA Keypair Generator
def generate_ecdsa_keypair() -> Tuple[str, str]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    ).decode('utf-8')
    
    public_key = private_key.public_key()
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode('utf-8')
    
    return private_pem, public_pem

# 8. ECDSA Sign Message
def sign_message_ecdsa(private_pem: str, message: bytes) -> str:
    private_key = serialization.load_pem_private_key(private_pem.encode('utf-8'), password=None)
    signature = private_key.sign(message, ec.ECDSA(hashes.SHA256()))
    return signature.hex()

# 9. ECDSA Verify Signature
def verify_signature_ecdsa(public_pem: str, message: bytes, signature_hex: str) -> bool:
    try:
        public_key = serialization.load_pem_public_key(public_pem.encode('utf-8'))
        public_key.verify(bytes.fromhex(signature_hex), message, ec.ECDSA(hashes.SHA256()))
        return True
    except Exception:
        return False
