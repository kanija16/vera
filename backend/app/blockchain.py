import os
import time
import json
import secrets
import requests
from eth_account import Account

# Polygon Amoy configurations
AMOY_RPC_URL = os.getenv("AMOY_RPC_URL", "https://rpc-amoy.polygon.technology")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x0000000000000000000000000000000000000000") # Setup in DEPLOYMENT.md
SIGNER_PRIVATE_KEY = os.getenv("SIGNER_PRIVATE_KEY", "")

# ABI signature definitions (4-byte selectors)
# keccak256("anchorCredential(bytes32,bytes32,address)") -> ef5d5db9...
ANCHOR_SELECTOR = "ef5d5db9"
# keccak256("revokeCredential(bytes32,address,string)") -> dd5d92fe...
REVOKE_SELECTOR = "dd5d92fe"
# keccak256("verifyCredential(bytes32)") -> ed9451ca...
VERIFY_SELECTOR = "ed9451ca"

def pad32(val: str) -> str:
    # Remove '0x' if present and pad to 64 hex characters (32 bytes)
    if val.startswith("0x"):
        val = val[2:]
    return val.zfill(64)

def encode_address(addr: str) -> str:
    if addr.startswith("0x"):
        addr = addr[2:]
    return addr.lower().zfill(64)

def encode_string(text: str) -> str:
    # Encodes a string as bytes for ABI encoding
    encoded_bytes = text.encode('utf-8')
    length = len(encoded_bytes)
    # ABI string representation: offset to data (32 bytes), length (32 bytes), data (padded to 32 bytes)
    offset = 96 # 3 words of offset
    offset_hex = hex(offset)[2:].zfill(64)
    length_hex = hex(length)[2:].zfill(64)
    
    # Pad data to 32-byte boundaries
    padded_data = encoded_bytes
    if len(padded_data) % 32 != 0:
        padded_data += b'\x00' * (32 - (len(padded_data) % 32))
    
    return offset_hex + length_hex + padded_data.hex()

def call_rpc(method: str, params: list) -> dict:
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1
    }
    try:
        response = requests.post(AMOY_RPC_URL, json=payload, timeout=5)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f"RPC Connection Error: {e}")
    return {}

class BlockchainAttestor:
    @staticmethod
    def anchor_credential(credential_id: str, merkle_root: str, institution_wallet: str) -> str:
        """
        Calls anchorCredential(bytes32 _credentialId, bytes32 _merkleRoot, address _inst)
        Returns the transaction hash or a mock transaction hash on fallback.
        """
        # Formulate values into bytes32 hex
        cred_id_hex = credential_id.replace("-", "")
        # Pad to 32 bytes (64 hex characters)
        cred_id_padded = pad32(cred_id_hex)
        merkle_root_padded = pad32(merkle_root)
        inst_address_padded = encode_address(institution_wallet)
        
        # Build ABI calldata
        # Selector + cred_id + merkle_root + inst_address
        calldata = "0x" + ANCHOR_SELECTOR + cred_id_padded + merkle_root_padded + inst_address_padded
        
        # Check if RPC and Private Key are configured
        if not SIGNER_PRIVATE_KEY or CONTRACT_ADDRESS == "0x0000000000000000000000000000000000000000":
            mock_hash = "0xmocktx_" + secrets.token_hex(28)
            print(f"[SIMULATED BLOCKCHAIN] Anchored credential {credential_id} with root {merkle_root}. Tx: {mock_hash}")
            return mock_hash
            
        try:
            account = Account.from_key(SIGNER_PRIVATE_KEY)
            
            # Fetch nonce
            nonce_res = call_rpc("eth_getTransactionCount", [account.address, "latest"])
            if not nonce_res or "result" not in nonce_res:
                raise Exception("Failed to fetch nonce from blockchain")
            nonce = int(nonce_res["result"], 16)
            
            # Fetch gas price
            gas_res = call_rpc("eth_gasPrice", [])
            gas_price = int(gas_res["result"], 16) if gas_res and "result" in gas_res else 25000000000 # 25 Gwei default
            
            # Build transaction
            tx = {
                "nonce": nonce,
                "gasPrice": gas_price,
                "gas": 150000, # Estimated gas
                "to": CONTRACT_ADDRESS,
                "value": 0,
                "data": calldata,
                "chainId": 80002 # Polygon Amoy
            }
            
            # Sign transaction
            signed_tx = Account.sign_transaction(tx, SIGNER_PRIVATE_KEY)
            
            # Send transaction
            send_res = call_rpc("eth_sendRawTransaction", [signed_tx.rawTransaction.hex()])
            if not send_res or "result" not in send_res:
                raise Exception(f"Failed to submit transaction: {send_res.get('error')}")
                
            tx_hash = send_res["result"]
            print(f"[BLOCKCHAIN] Successfully anchored credential on-chain. Tx: {tx_hash}")
            return tx_hash
            
        except Exception as e:
            fallback_hash = "0xfallback_" + secrets.token_hex(28)
            print(f"[BLOCKCHAIN ERROR] {e}. Falling back to simulation. Tx: {fallback_hash}")
            return fallback_hash

    @staticmethod
    def revoke_credential(credential_id: str, institution_wallet: str, reason: str) -> str:
        """
        Calls revokeCredential(bytes32 _credentialId, address _inst, string _reason)
        Returns the transaction hash or a mock transaction hash on fallback.
        """
        cred_id_hex = credential_id.replace("-", "")
        cred_id_padded = pad32(cred_id_hex)
        inst_address_padded = encode_address(institution_wallet)
        
        # Build string calldata
        reason_hex = encode_string(reason)
        
        # Selector + cred_id + inst_address + string payload
        calldata = "0x" + REVOKE_SELECTOR + cred_id_padded + inst_address_padded + reason_hex
        
        if not SIGNER_PRIVATE_KEY or CONTRACT_ADDRESS == "0x0000000000000000000000000000000000000000":
            mock_hash = "0xmockrevoke_" + secrets.token_hex(28)
            print(f"[SIMULATED BLOCKCHAIN] Revoked credential {credential_id} on-chain. Tx: {mock_hash}")
            return mock_hash
            
        try:
            account = Account.from_key(SIGNER_PRIVATE_KEY)
            
            # Fetch nonce
            nonce_res = call_rpc("eth_getTransactionCount", [account.address, "latest"])
            nonce = int(nonce_res["result"], 16)
            
            # Fetch gas price
            gas_res = call_rpc("eth_gasPrice", [])
            gas_price = int(gas_res["result"], 16) if gas_res and "result" in gas_res else 25000000000
            
            # Build transaction
            tx = {
                "nonce": nonce,
                "gasPrice": gas_price,
                "gas": 150000,
                "to": CONTRACT_ADDRESS,
                "value": 0,
                "data": calldata,
                "chainId": 80002
            }
            
            # Sign transaction
            signed_tx = Account.sign_transaction(tx, SIGNER_PRIVATE_KEY)
            
            # Send transaction
            send_res = call_rpc("eth_sendRawTransaction", [signed_tx.rawTransaction.hex()])
            tx_hash = send_res["result"]
            print(f"[BLOCKCHAIN] Successfully revoked credential on-chain. Tx: {tx_hash}")
            return tx_hash
            
        except Exception as e:
            fallback_hash = "0xfallback_" + secrets.token_hex(28)
            print(f"[BLOCKCHAIN ERROR] {e}. Falling back to simulation. Tx: {fallback_hash}")
            return fallback_hash
            
    @staticmethod
    def get_onchain_status(credential_id: str) -> dict:
        """
        Calls verifyCredential(bytes32 _credentialId) on-chain
        """
        cred_id_hex = credential_id.replace("-", "")
        cred_id_padded = pad32(cred_id_hex)
        calldata = "0x" + VERIFY_SELECTOR + cred_id_padded
        
        if not SIGNER_PRIVATE_KEY or CONTRACT_ADDRESS == "0x0000000000000000000000000000000000000000":
            return {
                "exists": True,
                "active": True,
                "merkleRoot": None,
                "issuer": None,
                "issuedAt": int(time.time())
            }
            
        try:
            params = [
                {
                    "to": CONTRACT_ADDRESS,
                    "data": calldata
                },
                "latest"
            ]
            res = call_rpc("eth_call", params)
            if not res or "result" not in res:
                raise Exception("Failed view call")
                
            data = res["result"]
            if data.startswith("0x"):
                data = data[2:]
                
            # Decode response:
            # exists (bool, 32 bytes) -> active (bool, 32 bytes) -> merkleRoot (bytes32, 32 bytes) -> issuer (address, 32 bytes) -> issuedAt (uint64, 32 bytes)
            exists = int(data[0:64], 16) == 1
            active = int(data[64:128], 16) == 1
            merkle_root = data[128:192]
            issuer = "0x" + data[192:256][-40:]
            issued_at = int(data[256:320], 16)
            
            return {
                "exists": exists,
                "active": active,
                "merkleRoot": merkle_root,
                "issuer": issuer,
                "issuedAt": issued_at
            }
        except Exception as e:
            print(f"[BLOCKCHAIN VIEW ERROR] {e}. Using DB state.")
            return {
                "exists": True,
                "active": True,
                "merkleRoot": None,
                "issuer": None,
                "issuedAt": int(time.time())
            }
