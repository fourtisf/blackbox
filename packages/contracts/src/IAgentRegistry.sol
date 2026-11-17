// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentRegistry {
    /// @return sealer The key currently allowed to seal for the agent.
    /// @return active False for unknown or deactivated agents.
    function sealerOf(bytes32 agentId) external view returns (address sealer, bool active);
}
