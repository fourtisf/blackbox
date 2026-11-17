// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {SealRegistry} from "../src/SealRegistry.sol";

/// @notice Deploys AgentRegistry and SealRegistry and writes deployments/<chainId>.json,
///         which the api, indexer and recorder read.
/// @dev Robinhood Chain mainnet (4663) is refused unless BLACKBOX_ALLOW_MAINNET=true,
///      which must only be set after ALFA approves a mainnet deploy.
contract Deploy is Script {
    uint256 internal constant ROBINHOOD_MAINNET = 4663;

    function run() external returns (AgentRegistry registry, SealRegistry seals) {
        if (block.chainid == ROBINHOOD_MAINNET) {
            require(vm.envOr("BLACKBOX_ALLOW_MAINNET", false), "Mainnet deploy needs explicit approval");
        }
        uint256 startBlock = block.number; // the indexer starts reading here (a safe lower bound)

        vm.startBroadcast();
        registry = new AgentRegistry();
        seals = new SealRegistry(registry);
        vm.stopBroadcast();

        string memory o = "deployment";
        vm.serializeUint(o, "chainId", block.chainid);
        vm.serializeUint(o, "startBlock", startBlock);
        vm.serializeAddress(o, "AgentRegistry", address(registry));
        string memory out = vm.serializeAddress(o, "SealRegistry", address(seals));
        string memory path =
            string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(out, path);

        console.log("AgentRegistry", address(registry));
        console.log("SealRegistry ", address(seals));
        console.log("Wrote", path);
    }
}
