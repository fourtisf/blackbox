// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./IAgentRegistry.sol";

/// @title AgentRegistry
/// @notice Binds one AI trading agent to one wallet and authorizes the key that seals its decisions.
/// @dev No owner and no upgrades. The agent id is derived from the registering wallet, so nobody can
///      register (or front-run) another wallet's id, and an id that was ever used can never be reused,
///      so a bad record cannot be reset under the same id.
contract AgentRegistry is IAgentRegistry {
    struct Agent {
        address wallet;
        address sealer;
        uint64 boundBlock;
        bool active;
        string metaURI;
    }

    mapping(bytes32 agentId => Agent) public agents;
    /// @notice The active agent of a wallet, or zero.
    mapping(address wallet => bytes32 agentId) public agentOf;

    event Registered(bytes32 indexed agentId, address indexed wallet, address sealer, string metaURI);
    event SealerChanged(bytes32 indexed agentId, address sealer);
    event MetaChanged(bytes32 indexed agentId, string metaURI);
    event Deactivated(bytes32 indexed agentId);

    error IdUsed();
    error WalletHasAgent();
    error NotWallet();
    error Inactive();
    error ZeroAddress();

    modifier onlyWallet(bytes32 agentId) {
        Agent storage a = agents[agentId];
        if (a.wallet != msg.sender) revert NotWallet();
        if (!a.active) revert Inactive();
        _;
    }

    /// @notice agentId = keccak256(abi.encode(wallet, chainId, salt)); the CLI computes the same value.
    function agentIdFor(address wallet, bytes32 salt) public view returns (bytes32) {
        return keccak256(abi.encode(wallet, block.chainid, salt));
    }

    /// @notice Registers the caller's wallet as an agent. The record starts at this block.
    function register(bytes32 salt, address sealer, string calldata metaURI)
        external
        returns (bytes32 agentId)
    {
        if (sealer == address(0)) revert ZeroAddress();
        if (agentOf[msg.sender] != bytes32(0)) revert WalletHasAgent();
        agentId = agentIdFor(msg.sender, salt);
        if (agents[agentId].wallet != address(0)) revert IdUsed();
        agents[agentId] = Agent({
            wallet: msg.sender,
            sealer: sealer,
            boundBlock: uint64(block.number),
            active: true,
            metaURI: metaURI
        });
        agentOf[msg.sender] = agentId;
        emit Registered(agentId, msg.sender, sealer, metaURI);
    }

    /// @notice Rotates the recorder's sealer key.
    function setSealer(bytes32 agentId, address sealer) external onlyWallet(agentId) {
        if (sealer == address(0)) revert ZeroAddress();
        agents[agentId].sealer = sealer;
        emit SealerChanged(agentId, sealer);
    }

    /// @notice Name, runtime, model and market as JSON at a URL or a data: URI.
    function setMeta(bytes32 agentId, string calldata metaURI) external onlyWallet(agentId) {
        agents[agentId].metaURI = metaURI;
        emit MetaChanged(agentId, metaURI);
    }

    /// @notice Ends the record permanently. The id can never be registered again.
    function deactivate(bytes32 agentId) external onlyWallet(agentId) {
        agents[agentId].active = false;
        delete agentOf[msg.sender];
        emit Deactivated(agentId);
    }

    function sealerOf(bytes32 agentId) external view returns (address sealer, bool active) {
        Agent storage a = agents[agentId];
        return (a.sealer, a.active);
    }
}
