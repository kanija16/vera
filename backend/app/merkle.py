import hashlib
from typing import List, Dict, Tuple

def hash_leaf(field_key: str, field_value: str, salt: str) -> bytes:
    payload = f"{field_key}:{field_value}:{salt}".encode('utf-8')
    return hashlib.sha256(payload).digest()

def combine_hashes(left: bytes, right: bytes) -> bytes:
    return hashlib.sha256(left + right).digest() if left <= right else hashlib.sha256(right + left).digest()

class MerkleTreeEngine:
    def __init__(self, key_value_pairs: Dict[str, str], salts: Dict[str, str]):
        self.keys = sorted(key_value_pairs.keys())
        self.salts = salts
        self.leaves: List[bytes] = [hash_leaf(k, str(key_value_pairs[k]), salts[k]) for k in self.keys]
        self.tree: List[List[bytes]] = [self.leaves]
        self._build_tree()

    def _build_tree(self):
        current_layer = self.leaves
        while len(current_layer) > 1:
            if len(current_layer) % 2 != 0:
                current_layer = current_layer + [current_layer[-1]]
            next_layer = [combine_hashes(current_layer[i], current_layer[i+1]) for i in range(0, len(current_layer), 2)]
            self.tree.append(next_layer)
            current_layer = next_layer

    def get_root(self) -> bytes:
        return self.tree[-1][0] if self.leaves else b''

    def generate_proof(self, target_key: str) -> List[Dict[str, str]]:
        idx = self.keys.index(target_key)
        proof = []
        for layer in range(len(self.tree) - 1):
            current_layer = self.tree[layer]
            if len(current_layer) % 2 != 0:
                current_layer = current_layer + [current_layer[-1]]
            is_right = (idx % 2 == 1)
            sibling_idx = idx - 1 if is_right else idx + 1
            proof.append({"position": "left" if is_right else "right", "hash": current_layer[sibling_idx].hex()})
            idx //= 2
        return proof

    @staticmethod
    def verify_proof(target_key: str, target_value: str, salt: str, proof: List[Dict[str, str]], root: bytes) -> bool:
        current_hash = hash_leaf(target_key, target_value, salt)
        for node in proof:
            sibling_hash = bytes.fromhex(node["hash"])
            current_hash = combine_hashes(sibling_hash, current_hash) if node["position"] == "left" else combine_hashes(current_hash, sibling_hash)
        return current_hash == root
