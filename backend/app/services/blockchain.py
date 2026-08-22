import os
import time
import threading
import hashlib
from typing import Dict, Any, Optional

class BlockchainAnchorService:
    def anchor_credential(self, credential_id: str, merkle_root: str, institution_id: str) -> Dict[str, Any]:
        raise NotImplementedError()
        
    def get_credential_status(self, credential_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()
        
    def update_credential_status(self, credential_id: str, status: str) -> bool:
        raise NotImplementedError()


class SimulatedLedgerService(BlockchainAnchorService):
    """
    A thread-safe, in-memory simulated blockchain smart contract ledger.
    Adheres strictly to the off-chain/on-chain separation pattern.
    Indicates LOCAL_DEMO anchor status.
    """
    _lock = threading.Lock()
    _ledger: Dict[str, Dict[str, Any]] = {}

    def anchor_credential(self, credential_id: str, merkle_root: str, institution_id: str) -> Dict[str, Any]:
        with self._lock:
            record = {
                "credential_id": str(credential_id),
                "merkle_root": str(merkle_root),
                "institution_id": str(institution_id),
                "status": "ACTIVE",
                "timestamp": int(time.time()),
                "anchor_type": "LOCAL_DEMO",
                "tx_hash": f"local-receipt-{hashlib.sha256(f'{credential_id}:{merkle_root}'.encode()).hexdigest()[:24]}"
            }
            self._ledger[str(credential_id)] = record
            return record

    def get_credential_status(self, credential_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            record = self._ledger.get(str(credential_id))
            if record:
                return dict(record)
            return None

    def update_credential_status(self, credential_id: str, status: str) -> bool:
        with self._lock:
            cred_str = str(credential_id)
            if cred_str in self._ledger:
                self._ledger[cred_str]["status"] = status
                self._ledger[cred_str]["timestamp"] = int(time.time())
                return True
            return False

    def clear_ledger(self):
        with self._lock:
            self._ledger.clear()


blockchain_service = SimulatedLedgerService()

# Legacy adapter for interface continuity
class BlockchainLedgerSimulator:
    @classmethod
    def anchor_credential(cls, credential_id: str, merkle_root: str, institution_id: str) -> Dict[str, Any]:
        return blockchain_service.anchor_credential(credential_id, merkle_root, institution_id)

    @classmethod
    def get_credential(cls, credential_id: str) -> Optional[Dict[str, Any]]:
        return blockchain_service.get_credential_status(credential_id)

    @classmethod
    def update_status(cls, credential_id: str, status: str) -> bool:
        return blockchain_service.update_credential_status(credential_id, status)

    @classmethod
    def clear_ledger(cls):
        if hasattr(blockchain_service, "clear_ledger"):
            blockchain_service.clear_ledger()
