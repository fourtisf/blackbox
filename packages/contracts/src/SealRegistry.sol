// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./IAgentRegistry.sol";

/// @title SealRegistry
/// @notice Records Merkle roots of agent decision fingerprints in a strict, gap-free sequence.
/// @dev The block number of each Sealed log is the "seal block" that proves a decision existed
///      before its trade. Roots are emitted, not stored, to keep sealing cheap. No owner: anyone
///      may relay a seal signed by the agent's sealer key, since the signature is the authorization.
contract SealRegistry {
    struct SealRequest {
        bytes32 agentId;
        bytes32 root;
        uint64 firstSeq;
        uint32 count;
        uint256 deadline;
    }

    bytes32 public constant SEAL_REQUEST_TYPEHASH =
        keccak256("SealRequest(bytes32 agentId,bytes32 root,uint64 firstSeq,uint32 count,uint256 deadline)");
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant NAME_HASH = keccak256("Blackbox SealRegistry");
    bytes32 private constant VERSION_HASH = keccak256("1");
    /// @dev secp256k1 n / 2: signatures with a larger s are malleable copies.
    uint256 private constant HALF_N = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    IAgentRegistry public immutable registry;
    uint256 private immutable cachedChainId;
    bytes32 private immutable cachedDomainSeparator;

    mapping(bytes32 agentId => uint64) public nextSeq;

    event Sealed(bytes32 indexed agentId, bytes32 root, uint64 firstSeq, uint32 count);

    error NotSealer();
    error Inactive();
    error BadSequence(uint64 expected, uint64 got);
    error EmptyBatch();
    error ZeroRoot();
    error Expired();
    error BadSignature();

    constructor(IAgentRegistry _registry) {
        registry = _registry;
        cachedChainId = block.chainid;
        cachedDomainSeparator = _buildDomainSeparator();
    }

    /// @notice Seals a batch from the agent's sealer key.
    function seal(bytes32 agentId, bytes32 root, uint64 firstSeq, uint32 count) external {
        (address sealer, bool active) = registry.sealerOf(agentId);
        if (!active) revert Inactive();
        if (msg.sender != sealer) revert NotSealer();
        _seal(agentId, root, firstSeq, count);
    }

    /// @notice Seals a batch signed by the agent's sealer key; the caller (our relayer) pays gas.
    /// @dev Replay is impossible: firstSeq must equal nextSeq, which advances on success.
    function sealBySig(SealRequest calldata req, bytes calldata sig) external {
        // A few seconds of sequencer clock drift cannot matter for a signature deadline.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp > req.deadline) revert Expired();
        (address sealer, bool active) = registry.sealerOf(req.agentId);
        if (!active) revert Inactive();
        if (_recover(hashSealRequest(req), sig) != sealer) revert BadSignature();
        _seal(req.agentId, req.root, req.firstSeq, req.count);
    }

    // solhint-disable-next-line func-name-mixedcase
    function DOMAIN_SEPARATOR() public view returns (bytes32) {
        return block.chainid == cachedChainId ? cachedDomainSeparator : _buildDomainSeparator();
    }

    /// @notice The EIP-712 digest a sealer signs for sealBySig.
    function hashSealRequest(SealRequest calldata req) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(SEAL_REQUEST_TYPEHASH, req.agentId, req.root, req.firstSeq, req.count, req.deadline)
        );
        return keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR(), structHash));
    }

    function _seal(bytes32 agentId, bytes32 root, uint64 firstSeq, uint32 count) private {
        if (count == 0) revert EmptyBatch();
        if (root == bytes32(0)) revert ZeroRoot();
        uint64 expected = nextSeq[agentId];
        if (firstSeq != expected) revert BadSequence(expected, firstSeq);
        nextSeq[agentId] = expected + count;
        emit Sealed(agentId, root, firstSeq, count);
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address signer) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (uint256(s) > HALF_N || (v != 27 && v != 28)) revert BadSignature();
        signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
    }
}
