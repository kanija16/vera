// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

contract AcademicRegistry {
    struct CredentialRecord {
        bytes32 merkleRoot;
        address issuer;
        uint64 issuedAt;
        bool revoked;
    }

    address public admin;
    mapping(address => bool) public trustedIssuers;
    mapping(bytes32 => CredentialRecord) public credentials;

    event CredentialAnchored(bytes32 indexed credentialId, bytes32 merkleRoot, address indexed issuer);
    event CredentialRevoked(bytes32 indexed credentialId, string reason);
    event BatchAnchored(address indexed issuer, uint256 count);

    modifier onlyTrustedIssuer() {
        require(trustedIssuers[msg.sender], "AUTH_ISSUER_NOT_AUTHORIZED");
        _;
    }

    constructor() { admin = msg.sender; }

    function addIssuer(address issuer) external {
        require(msg.sender == admin, "AUTH_ADMIN_ONLY");
        trustedIssuers[issuer] = true;
    }

    function anchorCredential(bytes32 credentialId, bytes32 merkleRoot) public onlyTrustedIssuer {
        require(credentials[credentialId].issuedAt == 0, "ERR_ALREADY_EXISTS");
        credentials[credentialId] = CredentialRecord(merkleRoot, msg.sender, uint64(block.timestamp), false);
        emit CredentialAnchored(credentialId, merkleRoot, msg.sender);
    }

    function batchAnchor(bytes32[] calldata credentialIds, bytes32[] calldata merkleRoots) external onlyTrustedIssuer {
        require(credentialIds.length == merkleRoots.length, "LENGTH_MISMATCH");
        for (uint256 i = 0; i < credentialIds.length; i++) {
            anchorCredential(credentialIds[i], merkleRoots[i]);
        }
        emit BatchAnchored(msg.sender, credentialIds.length);
    }

    function revokeCredential(bytes32 credentialId, string calldata reason) external {
        require(credentials[credentialId].issuer == msg.sender, "AUTH_NOT_ISSUER");
        credentials[credentialId].revoked = true;
        emit CredentialRevoked(credentialId, reason);
    }

    function getStatus(bytes32 credentialId) external view returns (bool exists, bool active, bytes32 root, address issuer) {
        CredentialRecord memory r = credentials[credentialId];
        if (r.issuedAt == 0) return (false, false, bytes32(0), address(0));
        return (true, !r.revoked, r.merkleRoot, r.issuer);
    }
}
