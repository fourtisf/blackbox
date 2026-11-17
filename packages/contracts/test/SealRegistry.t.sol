// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, stdError} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {SealRegistry} from "../src/SealRegistry.sol";

contract SealRegistryTest is Test {
    uint256 internal constant SECP256K1_N =
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    AgentRegistry internal agents;
    SealRegistry internal seals;
    address internal wallet = makeAddr("wallet");
    address internal relayer = makeAddr("relayer");
    address internal sealer;
    uint256 internal sealerPk;
    bytes32 internal id;
    bytes32 internal constant ROOT = keccak256("root");

    function setUp() public {
        (sealer, sealerPk) = makeAddrAndKey("sealer");
        agents = new AgentRegistry();
        seals = new SealRegistry(agents);
        vm.prank(wallet);
        id = agents.register(keccak256("salt"), sealer, "");
        vm.warp(1_763_372_520);
    }

    // ---------- seal ----------

    function test_seal_emitsAndAdvancesTheSequence() public {
        vm.expectEmit(address(seals));
        emit SealRegistry.Sealed(id, ROOT, 0, 1);
        vm.prank(sealer);
        seals.seal(id, ROOT, 0, 1);
        assertEq(seals.nextSeq(id), 1);

        vm.prank(sealer);
        seals.seal(id, keccak256("batch"), 1, 64);
        assertEq(seals.nextSeq(id), 65);
    }

    function test_seal_revertsOnGap() public {
        vm.prank(sealer);
        vm.expectRevert(abi.encodeWithSelector(SealRegistry.BadSequence.selector, 0, 1));
        seals.seal(id, ROOT, 1, 1);
    }

    function test_seal_revertsOnRepeat() public {
        vm.startPrank(sealer);
        seals.seal(id, ROOT, 0, 2);
        vm.expectRevert(abi.encodeWithSelector(SealRegistry.BadSequence.selector, 2, 0));
        seals.seal(id, ROOT, 0, 2);
        vm.expectRevert(abi.encodeWithSelector(SealRegistry.BadSequence.selector, 2, 1));
        seals.seal(id, ROOT, 1, 1);
        vm.stopPrank();
    }

    function test_seal_onlyTheCurrentSealer() public {
        vm.prank(wallet); // the agent wallet is not the sealer
        vm.expectRevert(SealRegistry.NotSealer.selector);
        seals.seal(id, ROOT, 0, 1);
        vm.prank(relayer);
        vm.expectRevert(SealRegistry.NotSealer.selector);
        seals.seal(id, ROOT, 0, 1);
    }

    function test_seal_followsSealerRotation() public {
        address next = makeAddr("next");
        vm.prank(wallet);
        agents.setSealer(id, next);

        vm.prank(sealer);
        vm.expectRevert(SealRegistry.NotSealer.selector);
        seals.seal(id, ROOT, 0, 1);
        vm.prank(next);
        seals.seal(id, ROOT, 0, 1);
        assertEq(seals.nextSeq(id), 1);
    }

    function test_seal_revertsForUnknownOrDeactivatedAgent() public {
        vm.prank(sealer);
        vm.expectRevert(SealRegistry.Inactive.selector);
        seals.seal(keccak256("unknown"), ROOT, 0, 1);

        vm.prank(wallet);
        agents.deactivate(id);
        vm.prank(sealer);
        vm.expectRevert(SealRegistry.Inactive.selector);
        seals.seal(id, ROOT, 0, 1);
    }

    function test_seal_revertsOnEmptyBatchOrZeroRoot() public {
        vm.startPrank(sealer);
        vm.expectRevert(SealRegistry.EmptyBatch.selector);
        seals.seal(id, ROOT, 0, 0);
        vm.expectRevert(SealRegistry.ZeroRoot.selector);
        seals.seal(id, bytes32(0), 0, 1);
        vm.stopPrank();
    }

    function test_seal_sequencesAreIndependentPerAgent() public {
        address other = makeAddr("otherWallet");
        vm.prank(other);
        bytes32 id2 = agents.register(keccak256("salt"), sealer, "");
        vm.startPrank(sealer);
        seals.seal(id, ROOT, 0, 5);
        seals.seal(id2, ROOT, 0, 1);
        vm.stopPrank();
        assertEq(seals.nextSeq(id), 5);
        assertEq(seals.nextSeq(id2), 1);
    }

    function test_seal_revertsOnSequenceOverflow() public {
        // nextSeq is mapping slot 0 (immutables use no storage).
        vm.store(
            address(seals), keccak256(abi.encode(id, uint256(0))), bytes32(uint256(type(uint64).max - 1))
        );
        vm.prank(sealer);
        vm.expectRevert(stdError.arithmeticError);
        seals.seal(id, ROOT, type(uint64).max - 1, 2);
    }

    // ---------- sealBySig ----------

    function _req(uint64 firstSeq, uint32 count) internal view returns (SealRegistry.SealRequest memory) {
        return SealRegistry.SealRequest({
            agentId: id, root: ROOT, firstSeq: firstSeq, count: count, deadline: block.timestamp + 60
        });
    }

    function _sign(uint256 pk, SealRegistry.SealRequest memory req) internal view returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, seals.hashSealRequest(req));
        return abi.encodePacked(r, s, v);
    }

    function test_sealBySig_anyoneCanRelayAValidSignature() public {
        SealRegistry.SealRequest memory req = _req(0, 3);
        bytes memory sig = _sign(sealerPk, req);
        vm.expectEmit(address(seals));
        emit SealRegistry.Sealed(id, ROOT, 0, 3);
        vm.prank(relayer);
        seals.sealBySig(req, sig);
        assertEq(seals.nextSeq(id), 3);
    }

    function test_sealBySig_revertsAfterDeadline() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(sealerPk, req);
        vm.warp(req.deadline + 1);
        vm.expectRevert(SealRegistry.Expired.selector);
        seals.sealBySig(req, sig);
    }

    function test_sealBySig_acceptsExactlyAtDeadline() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(sealerPk, req);
        vm.warp(req.deadline);
        seals.sealBySig(req, sig);
        assertEq(seals.nextSeq(id), 1);
    }

    function test_sealBySig_cannotBeReplayed() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(sealerPk, req);
        seals.sealBySig(req, sig);
        vm.expectRevert(abi.encodeWithSelector(SealRegistry.BadSequence.selector, 1, 0));
        seals.sealBySig(req, sig);
    }

    function test_sealBySig_revertsForWrongSigner() public {
        (, uint256 otherPk) = makeAddrAndKey("other");
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(otherPk, req); // sign first: expectRevert applies to the next call
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, sig);
    }

    function test_sealBySig_revertsForTheOldKeyAfterRotation() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(sealerPk, req);
        vm.prank(wallet);
        agents.setSealer(id, makeAddr("next"));
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, sig);
    }

    function test_sealBySig_revertsWhenAnyFieldIsChanged() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(sealerPk, req);
        SealRegistry.SealRequest memory changed = req;
        changed.root = keccak256("other root");
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(changed, sig);
        changed = _req(0, 2);
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(changed, sig);
    }

    function test_sealBySig_rejectsMalleableHighS() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sealerPk, seals.hashSealRequest(req));
        bytes32 highS = bytes32(SECP256K1_N - uint256(s));
        uint8 flippedV = v == 27 ? 28 : 27;
        // Same signer under plain ecrecover, but the contract must refuse it.
        assertEq(ecrecover(seals.hashSealRequest(req), flippedV, r, highS), sealer);
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, abi.encodePacked(r, highS, flippedV));
    }

    function test_sealBySig_rejectsMalformedSignatures() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sealerPk, seals.hashSealRequest(req));
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, abi.encodePacked(r, s)); // 64 bytes
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, abi.encodePacked(r, s, uint8(v + 2))); // v not 27/28
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, abi.encodePacked(bytes32(0), bytes32(0), uint8(27))); // recovers to zero
    }

    function test_sealBySig_revertsForDeactivatedAgent() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(sealerPk, req);
        vm.prank(wallet);
        agents.deactivate(id);
        vm.expectRevert(SealRegistry.Inactive.selector);
        seals.sealBySig(req, sig);
    }

    function test_domainSeparator_followsTheChainId() public {
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(sealerPk, req);
        bytes32 before = seals.DOMAIN_SEPARATOR();
        vm.chainId(999_999);
        assertTrue(seals.DOMAIN_SEPARATOR() != before);
        // A signature for the original chain is useless on a fork with another chain id.
        vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, sig);
    }

    // ---------- fuzz ----------

    function testFuzz_seal_anySequenceOfBatchesStaysGapFree(uint16[8] memory counts) public {
        uint64 expected;
        vm.startPrank(sealer);
        for (uint256 i; i < counts.length; i++) {
            uint32 c = uint32(bound(counts[i], 1, 5000));
            seals.seal(id, keccak256(abi.encode(i)), expected, c);
            expected += c;
            assertEq(seals.nextSeq(id), expected);
        }
        vm.stopPrank();
    }

    function testFuzz_seal_rejectsAnyOtherFirstSeq(uint64 firstSeq, uint32 count) public {
        vm.assume(firstSeq != 0);
        count = uint32(bound(count, 1, type(uint32).max));
        vm.prank(sealer);
        vm.expectRevert(abi.encodeWithSelector(SealRegistry.BadSequence.selector, 0, firstSeq));
        seals.seal(id, ROOT, firstSeq, count);
    }

    function testFuzz_sealBySig_onlyTheSealerKeyWorks(uint256 pk) public {
        pk = bound(pk, 1, SECP256K1_N - 1);
        SealRegistry.SealRequest memory req = _req(0, 1);
        bytes memory sig = _sign(pk, req);
        if (pk != sealerPk) vm.expectRevert(SealRegistry.BadSignature.selector);
        seals.sealBySig(req, sig);
        if (pk == sealerPk) assertEq(seals.nextSeq(id), 1);
    }

    // ---------- gas ----------

    /// @dev Run with `forge test --isolate` (the package test script does): each call is then a real
    ///      transaction, so this measures the full gas of a steady-state seal (nextSeq already non-zero),
    ///      including the 21,000 intrinsic and calldata gas, against the 40k target.
    function test_gas_steadyStateSealIsUnderTarget() public {
        vm.prank(sealer);
        seals.seal(id, ROOT, 0, 1);
        vm.cool(address(seals));
        vm.cool(address(agents));
        vm.prank(sealer);
        uint256 g = gasleft();
        seals.seal(id, keccak256("next"), 1, 1);
        uint256 used = g - gasleft();
        emit log_named_uint("steady-state seal gas", used);
        assertLt(used, 40_000);
    }
}
