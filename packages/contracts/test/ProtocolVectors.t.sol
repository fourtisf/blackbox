// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, Vm} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {SealRegistry} from "../src/SealRegistry.sol";

/// @notice Recomputes packages/protocol/vectors.json in Solidity, so the TypeScript protocol and the
///         EVM agree byte for byte on leaves, Merkle roots, proofs, agent ids and EIP-712 digests.
/// @dev The Solidity hashing here is a test oracle only. Production hashing lives in packages/protocol.
contract ProtocolVectorsTest is Test {
    string internal json;

    function setUp() public {
        json = vm.readFile(string.concat(vm.projectRoot(), "/../protocol/vectors.json"));
    }

    // ---------- oracle ----------

    function _leaf(bytes32 salt, bytes32 recordHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(bytes1(0x00), salt, recordHash));
    }

    function _pair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a <= b
            ? keccak256(abi.encodePacked(bytes1(0x01), a, b))
            : keccak256(abi.encodePacked(bytes1(0x01), b, a));
    }

    function _root(bytes32[] memory level) internal pure returns (bytes32) {
        uint256 n = level.length;
        while (n > 1) {
            uint256 m = (n + 1) / 2;
            for (uint256 i; i < m; i++) {
                level[i] = 2 * i + 1 < n ? _pair(level[2 * i], level[2 * i + 1]) : level[2 * i];
            }
            n = m;
        }
        return level[0];
    }

    function _verify(bytes32 leaf, bytes32[] memory proof, bytes32 root) internal pure returns (bool) {
        bytes32 node = leaf;
        for (uint256 i; i < proof.length; i++) {
            node = _pair(node, proof[i]);
        }
        return node == root;
    }

    // ---------- json helpers ----------

    function _key(string memory list, uint256 i, string memory field) internal pure returns (string memory) {
        return string.concat(".", list, "[", vm.toString(i), "]", field);
    }

    function _count(string memory name) internal view returns (uint256) {
        return vm.parseJsonUint(json, string.concat(".counts.", name));
    }

    // ---------- vectors ----------

    function test_protocolVersionIsOne() public view {
        assertEq(vm.parseJsonUint(json, ".protocolVersion"), 1);
    }

    function test_records_recordHashAndLeaf() public view {
        uint256 n = _count("records");
        assertGt(n, 0);
        for (uint256 i; i < n; i++) {
            string memory canonical = vm.parseJsonString(json, _key("records", i, ".canonical"));
            bytes32 recordHash = vm.parseJsonBytes32(json, _key("records", i, ".recordHash"));
            bytes32 salt = vm.parseJsonBytes32(json, _key("records", i, ".salt"));
            assertEq(keccak256(bytes(canonical)), recordHash, "recordHash = keccak256(utf8(JCS(record)))");
            assertEq(_leaf(salt, recordHash), vm.parseJsonBytes32(json, _key("records", i, ".leaf")), "leaf");
        }
    }

    function test_pairs() public view {
        for (uint256 i; i < _count("pairs"); i++) {
            bytes32 a = vm.parseJsonBytes32(json, _key("pairs", i, ".a"));
            bytes32 b = vm.parseJsonBytes32(json, _key("pairs", i, ".b"));
            assertEq(_pair(a, b), vm.parseJsonBytes32(json, _key("pairs", i, ".hash")));
        }
    }

    function test_batches_rootsAndEveryProof() public view {
        uint256 n = _count("batches");
        assertGt(n, 0);
        for (uint256 i; i < n; i++) {
            bytes32[] memory leaves = vm.parseJsonBytes32Array(json, _key("batches", i, ".leaves"));
            bytes32 root = vm.parseJsonBytes32(json, _key("batches", i, ".root"));
            for (uint256 j; j < leaves.length; j++) {
                bytes32[] memory proof = vm.parseJsonBytes32Array(
                    json, string.concat(_key("batches", i, ".proofs"), "[", vm.toString(j), "]")
                );
                assertTrue(_verify(leaves[j], proof, root), "proof");
            }
            assertEq(_root(leaves), root, "root"); // _root overwrites leaves, so it runs last
        }
    }

    function test_agentIds_matchTheRegistry() public {
        AgentRegistry reg = new AgentRegistry();
        for (uint256 i; i < _count("agentIds"); i++) {
            address wallet = vm.parseJsonAddress(json, _key("agentIds", i, ".wallet"));
            bytes32 salt = vm.parseJsonBytes32(json, _key("agentIds", i, ".salt"));
            bytes32 expected = vm.parseJsonBytes32(json, _key("agentIds", i, ".agentId"));
            vm.chainId(vm.parseJsonUint(json, _key("agentIds", i, ".chainId")));
            assertEq(reg.agentIdFor(wallet, salt), expected);
            vm.prank(wallet);
            assertEq(reg.register(salt, address(0xBEEF), ""), expected);
        }
    }

    /// @notice End to end: register the vector agent, seal the vector records through the real contracts,
    ///         relay the vector EIP-712 request, and prove every record leaf into a root the chain emitted.
    function test_endToEnd_sealTheVectorRecords() public {
        (address sealer, uint256 sealerPk) = makeAddrAndKey("vector-sealer");
        address wallet = vm.parseJsonAddress(json, ".agentIds[0].wallet");
        bytes32 agentId = vm.parseJsonBytes32(json, ".agentIds[0].agentId");

        vm.chainId(vm.parseJsonUint(json, ".agentIds[0].chainId"));
        AgentRegistry reg = new AgentRegistry();
        vm.prank(wallet);
        assertEq(reg.register(vm.parseJsonBytes32(json, ".agentIds[0].salt"), sealer, ""), agentId);

        // The EIP-712 vector is for chain 31337 and a fixed contract address: deploy exactly there.
        vm.chainId(vm.parseJsonUint(json, ".eip712[0].chainId"));
        address at = vm.parseJsonAddress(json, ".eip712[0].verifyingContract");
        deployCodeTo("SealRegistry.sol:SealRegistry", abi.encode(reg), at);
        SealRegistry seals = SealRegistry(at);
        assertEq(seals.DOMAIN_SEPARATOR(), vm.parseJsonBytes32(json, ".eip712[0].domainSeparator"));

        // Record 0 (a trade) is sealed alone: root = leaf.
        bytes32 leaf0 = vm.parseJsonBytes32(json, ".records[0].leaf");
        vm.recordLogs();
        vm.prank(sealer);
        seals.seal(agentId, leaf0, 0, 1);

        // Records 1..4 are relayed as one batch from the vector request.
        SealRegistry.SealRequest memory req = SealRegistry.SealRequest({
            agentId: vm.parseJsonBytes32(json, ".eip712[0].request.agentId"),
            root: vm.parseJsonBytes32(json, ".eip712[0].request.root"),
            firstSeq: uint64(vm.parseJsonUint(json, ".eip712[0].request.firstSeq")),
            count: uint32(vm.parseJsonUint(json, ".eip712[0].request.count")),
            deadline: vm.parseJsonUint(json, ".eip712[0].request.deadline")
        });
        bytes32 digest = seals.hashSealRequest(req);
        assertEq(digest, vm.parseJsonBytes32(json, ".eip712[0].digest"), "protocol digest = contract digest");
        vm.warp(req.deadline - 10);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sealerPk, digest);
        vm.prank(makeAddr("relayer"));
        seals.sealBySig(req, abi.encodePacked(r, s, v));
        assertEq(seals.nextSeq(agentId), 5);

        // Read the roots back from the Sealed logs, as the indexer and the browser would.
        Vm.Log[] memory logs = vm.getRecordedLogs();
        assertEq(logs.length, 2);
        (bytes32 root0,,) = abi.decode(logs[0].data, (bytes32, uint64, uint32));
        (bytes32 root1, uint64 first1, uint32 count1) = abi.decode(logs[1].data, (bytes32, uint64, uint32));
        assertEq(root0, leaf0);
        assertEq(first1, 1);
        assertEq(count1, 4);
        // batches[3] is records 1..4: every record leaf proves into the emitted root.
        for (uint256 j; j < 4; j++) {
            bytes32 leaf = vm.parseJsonBytes32(json, _key("records", j + 1, ".leaf"));
            bytes32[] memory proof =
                vm.parseJsonBytes32Array(json, string.concat(".batches[3].proofs[", vm.toString(j), "]"));
            assertTrue(_verify(leaf, proof, root1));
        }
    }
}
