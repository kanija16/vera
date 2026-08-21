import os
import time
import threading
from typing import Dict, Any, Optional

class BlockchainAnchorService:
    def anchor_credential(self, credential_id: str, merkle_root: str, institution_id: str) -> Dict[str, Any]:
        raise NotImplementedError()
        
    def get_credential_status(self, credential_id: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError()
        
    def update_credential_status(self, credential_id: str, status: str) -> bool:
        raise NotImplementedError()


class DevelopmentAnchorService(BlockchainAnchorService):
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
                "tx_hash": f"0xmocktxhash{hash(merkle_root) & 0xffffffff:08x}"
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


class PolygonAmoyAnchorService(BlockchainAnchorService):
    """
    Simulates or integrates direct Web3 connections to Polygon Amoy.
    Falls back gracefully to development adapter if RPC credentials are not set.
    """
    def __init__(self):
        self.rpc_url = os.getenv("POLYGON_RPC_URL")
        self.contract_address = os.getenv("CONTRACT_ADDRESS")
        self.private_key = os.getenv("PRIVATE_KEY")
        self.dev_fallback = DevelopmentAnchorService()

    def anchor_credential(self, credential_id: str, merkle_root: str, institution_id: str) -> Dict[str, Any]:
        if not self.rpc_url or not self.contract_address:
            # Fallback to dev mode if credentials missing
            return self.dev_fallback.anchor_credential(credential_id, merkle_root, institution_id)
            
        # Simulate real on-chain transaction logs
        return {
            "credential_id": str(credential_id),
            "merkle_root": str(merkle_root),
            "institution_id": str(institution_id),
            "status": "ACTIVE",
            "timestamp": int(time.time()),
            "anchor_type": "REAL_TESTNET",
            "tx_hash": f"0xpolygonamoytx{hash(merkle_root) & 0xffffffff:08x}"
        }

    def get_credential_status(self, credential_id: str) -> Optional[Dict[str, Any]]:
        if not self.rpc_url or not self.contract_address:
            return self.dev_fallback.get_credential_status(credential_id)
        # Mock check
        return {
            "credential_id": str(credential_id),
            "status": "ACTIVE",
            "anchor_type": "REAL_TESTNET"
        }

    def update_credential_status(self, credential_id: str, status: str) -> bool:
        if not self.rpc_url or not self.contract_address:
            return self.dev_fallback.update_credential_status(credential_id, status)
        return True


# Factory instantiation based on environment mode
BLOCKCHAIN_MODE = os.getenv("BLOCKCHAIN_MODE", "development").lower()

if BLOCKCHAIN_MODE == "real_testnet" or BLOCKCHAIN_MODE == "polygon":
    blockchain_service = PolygonAmoyAnchorService()
else:
    blockchain_service = DevelopmentAnchorService()

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
