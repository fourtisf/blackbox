// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    function sealerOf(bytes32 agentId) external view returns (address sealer, bool active);
}

/// @title SealRegistry
/// @notice Records Merkle roots of agent decision fingerprints in a strict, gap-free sequence.
/// @dev Draft for Claude Code. Review, test and harden before any deployment.
///      The block number of each Sealed log is the "seal block" used to prove a decision
///      existed before its trade.
contract SealRegistry {
    IAgentRegistry public immutable registry;

    // EIP-712
    bytes32 private constant SEAL_TYPEHASH =
        keccak256("SealRequest(bytes32 agentId,bytes32 root,uint64 firstSeq,uint32 count,uint256 deadline)");
    bytes32 private immutable DOMAIN_SEPARATOR;

    mapping(bytes32 => uint64) public nextSeq;

    struct SealRequest {
        bytes32 agentId;
        bytes32 root;
        uint64 firstSeq;
        uint32 count;
        uint256 deadline;
    }

    event Sealed(bytes32 indexed agentId, bytes32 root, uint64 firstSeq, uint32 count);

    error NotSealer();
    error Inactive();
    error BadSequence(uint64 expected, uint64 got);
    error EmptyBatch();
    error Expired();
    error BadSignature();

    constructor(IAgentRegistry _registry) {
        registry = _registry;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("Blackbox SealRegistry")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function seal(bytes32 agentId, bytes32 root, uint64 firstSeq, uint32 count) external {
        (address sealer, bool active) = registry.sealerOf(agentId);
        if (!active) revert Inactive();
        if (msg.sender != sealer) revert NotSealer();
        _seal(agentId, root, firstSeq, count);
    }

    /// @notice Lets a relayer pay gas for a seal signed by the agent's sealer key.
    function sealBySig(SealRequest calldata req, bytes calldata sig) external {
        if (block.timestamp > req.deadline) revert Expired();
        (address sealer, bool active) = registry.sealerOf(req.agentId);
        if (!active) revert Inactive();
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(SEAL_TYPEHASH, req.agentId, req.root, req.firstSeq, req.count, req.deadline))
            )
        );
        if (_recover(digest, sig) != sealer) revert BadSignature();
        // Replay is impossible: firstSeq must equal nextSeq, which advances on success.
        _seal(req.agentId, req.root, req.firstSeq, req.count);
    }

    function _seal(bytes32 agentId, bytes32 root, uint64 firstSeq, uint32 count) private {
        if (count == 0) revert EmptyBatch();
        uint64 expected = nextSeq[agentId];
        if (firstSeq != expected) revert BadSequence(expected, firstSeq);
        nextSeq[agentId] = expected + count;
        emit Sealed(agentId, root, firstSeq, count);
    }

    function _recover(bytes32 digest, bytes calldata sig) private pure returns (address) {
        if (sig.length != 65) revert BadSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        // reject malleable signatures
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) revert BadSignature();
        address signer = ecrecover(digest, v, r, s);
        if (signer == address(0)) revert BadSignature();
        return signer;
    }
}
