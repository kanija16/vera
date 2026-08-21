import threading
import time
from typing import Dict, Any, Optional

class BlockchainLedgerSimulator:
    """
    A thread-safe, in-memory simulated blockchain smart contract ledger.
    Adheres strictly to the off-chain/on-chain separation pattern:
    Only credential ID, Merkle Root, Issuer ID, status and timestamps are stored.
    No PII or grades are stored here.
    """
    _lock = threading.Lock()
    _ledger: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def anchor_credential(
        cls, 
        credential_id: str, 
        merkle_root: str, 
        institution_id: str
    ) -> Dict[str, Any]:
        """
        Simulates anchoring a Merkle root to the smart contract registry.
        """
        with cls._lock:
            record = {
                "credential_id": str(credential_id),
                "merkle_root": str(merkle_root),
                "institution_id": str(institution_id),
                "status": "ACTIVE",
                "timestamp": int(time.time())
            }
            cls._ledger[str(credential_id)] = record
            return record

    @classmethod
    def get_credential(cls, credential_id: str) -> Optional[Dict[str, Any]]:
        """
        Simulates querying credential info from the blockchain registry.
        """
        with cls._lock:
            record = cls._ledger.get(str(credential_id))
            if record:
                return dict(record) # Return copy to prevent mutation outside lock
            return None

    @classmethod
    def update_status(cls, credential_id: str, status: str) -> bool:
        """
        Simulates modifying credential status (ACTIVE/REVOKED) on the smart contract registry.
        """
        with cls._lock:
            cred_str = str(credential_id)
            if cred_str in cls._ledger:
                cls._ledger[cred_str]["status"] = status
                cls._ledger[cred_str]["timestamp"] = int(time.time()) # Update block time
                return True
            return False

    @classmethod
    def clear_ledger(cls):
        """
        Resets ledger state (useful for test isolation).
        """
        with cls._lock:
            cls._ledger.clear()
