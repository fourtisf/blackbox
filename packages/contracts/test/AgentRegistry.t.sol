// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry internal reg;
    address internal wallet = makeAddr("wallet");
    address internal sealer = makeAddr("sealer");
    address internal stranger = makeAddr("stranger");
    bytes32 internal constant SALT = keccak256("salt");

    function setUp() public {
        reg = new AgentRegistry();
    }

    function _register() internal returns (bytes32 id) {
        vm.prank(wallet);
        id = reg.register(SALT, sealer, "data:application/json,{}");
    }

    function test_register_bindsWalletAndStartsRecordAtThisBlock() public {
        vm.roll(115_000_000);
        bytes32 expected = keccak256(abi.encode(wallet, block.chainid, SALT));
        vm.expectEmit(address(reg));
        emit AgentRegistry.Registered(expected, wallet, sealer, "ipfs://meta");
        vm.prank(wallet);
        bytes32 id = reg.register(SALT, sealer, "ipfs://meta");

        assertEq(id, expected);
        assertEq(reg.agentIdFor(wallet, SALT), expected);
        (address w, address s, uint64 bound, bool active, string memory meta) = reg.agents(id);
        assertEq(w, wallet);
        assertEq(s, sealer);
        assertEq(bound, 115_000_000);
        assertTrue(active);
        assertEq(meta, "ipfs://meta");
        assertEq(reg.agentOf(wallet), id);
        (address s2, bool a2) = reg.sealerOf(id);
        assertEq(s2, sealer);
        assertTrue(a2);
    }

    function test_register_idDependsOnChain() public {
        vm.chainId(4663);
        bytes32 onMainnet = reg.agentIdFor(wallet, SALT);
        vm.chainId(31337);
        assertTrue(onMainnet != reg.agentIdFor(wallet, SALT));
    }

    function test_register_nobodyCanClaimAnotherWalletsId() public {
        // A front-runner copying the salt gets an id derived from its own address, not the victim's.
        vm.prank(stranger);
        bytes32 strangers = reg.register(SALT, sealer, "");
        bytes32 id = _register();
        assertTrue(strangers != id);
        assertEq(id, reg.agentIdFor(wallet, SALT));
    }

    function test_register_revertsOnZeroSealer() public {
        vm.prank(wallet);
        vm.expectRevert(AgentRegistry.ZeroAddress.selector);
        reg.register(SALT, address(0), "");
    }

    function test_register_oneActiveAgentPerWallet() public {
        _register();
        vm.prank(wallet);
        vm.expectRevert(AgentRegistry.WalletHasAgent.selector);
        reg.register(keccak256("other"), sealer, "");
    }

    function test_register_deactivatedIdCanNeverBeReused() public {
        bytes32 id = _register();
        vm.prank(wallet);
        reg.deactivate(id);
        vm.prank(wallet);
        vm.expectRevert(AgentRegistry.IdUsed.selector);
        reg.register(SALT, sealer, "");
    }

    function test_register_newSaltAfterDeactivateStartsAFreshRecord() public {
        bytes32 id = _register();
        vm.prank(wallet);
        reg.deactivate(id);
        vm.roll(block.number + 10);
        vm.prank(wallet);
        bytes32 id2 = reg.register(keccak256("second"), sealer, "");
        assertTrue(id2 != id);
        assertEq(reg.agentOf(wallet), id2);
        (,,, bool oldActive,) = reg.agents(id);
        assertFalse(oldActive);
    }

    function test_setSealer_rotatesTheKey() public {
        bytes32 id = _register();
        address next = makeAddr("next");
        vm.expectEmit(address(reg));
        emit AgentRegistry.SealerChanged(id, next);
        vm.prank(wallet);
        reg.setSealer(id, next);
        (address s,) = reg.sealerOf(id);
        assertEq(s, next);
    }

    function test_setSealer_onlyWalletWhileActive() public {
        bytes32 id = _register();
        vm.prank(sealer); // the sealer key itself cannot rotate keys
        vm.expectRevert(AgentRegistry.NotWallet.selector);
        reg.setSealer(id, stranger);

        vm.prank(wallet);
        vm.expectRevert(AgentRegistry.ZeroAddress.selector);
        reg.setSealer(id, address(0));

        vm.prank(wallet);
        reg.deactivate(id);
        vm.prank(wallet);
        vm.expectRevert(AgentRegistry.Inactive.selector);
        reg.setSealer(id, stranger);
    }

    function test_setMeta_onlyWallet() public {
        bytes32 id = _register();
        vm.expectEmit(address(reg));
        emit AgentRegistry.MetaChanged(id, "ipfs://v2");
        vm.prank(wallet);
        reg.setMeta(id, "ipfs://v2");
        (,,,, string memory meta) = reg.agents(id);
        assertEq(meta, "ipfs://v2");

        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.NotWallet.selector);
        reg.setMeta(id, "ipfs://evil");
    }

    function test_deactivate_endsTheRecord() public {
        bytes32 id = _register();
        vm.prank(stranger);
        vm.expectRevert(AgentRegistry.NotWallet.selector);
        reg.deactivate(id);

        vm.expectEmit(address(reg));
        emit AgentRegistry.Deactivated(id);
        vm.prank(wallet);
        reg.deactivate(id);
        assertEq(reg.agentOf(wallet), bytes32(0));
        (address s, bool active) = reg.sealerOf(id);
        assertEq(s, sealer);
        assertFalse(active);

        vm.prank(wallet);
        vm.expectRevert(AgentRegistry.Inactive.selector);
        reg.deactivate(id);
    }

    function test_sealerOf_unknownAgentIsInactive() public view {
        (address s, bool active) = reg.sealerOf(keccak256("nobody"));
        assertEq(s, address(0));
        assertFalse(active);
    }

    function testFuzz_register_anyWalletSaltAndSealer(address w, bytes32 salt, address s) public {
        vm.assume(w != address(0) && s != address(0));
        vm.prank(w);
        bytes32 id = reg.register(salt, s, "");
        assertEq(id, keccak256(abi.encode(w, block.chainid, salt)));
        assertEq(reg.agentOf(w), id);
    }
}
