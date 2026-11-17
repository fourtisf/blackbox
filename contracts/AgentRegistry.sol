// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AgentRegistry
/// @notice Binds one AI trading agent to one wallet and authorizes the key that seals its decisions.
/// @dev Draft for Claude Code. Review, test and harden before any deployment.
contract AgentRegistry {
    struct Agent {
        address wallet;
        address sealer;
        uint64 boundBlock;
        bool active;
        string metaURI;
    }

    mapping(bytes32 => Agent) public agents;
    mapping(address => bytes32) public agentOf; // active agent per wallet
    mapping(bytes32 => bool) public used; // ids can never be reused

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
        if (agents[agentId].wallet != msg.sender) revert NotWallet();
        if (!agents[agentId].active) revert Inactive();
        _;
    }

    function register(bytes32 agentId, address sealer, string calldata metaURI) external {
        if (used[agentId]) revert IdUsed();
        if (agentOf[msg.sender] != bytes32(0)) revert WalletHasAgent();
        if (sealer == address(0)) revert ZeroAddress();
        used[agentId] = true;
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

    function setSealer(bytes32 agentId, address sealer) external onlyWallet(agentId) {
        if (sealer == address(0)) revert ZeroAddress();
        agents[agentId].sealer = sealer;
        emit SealerChanged(agentId, sealer);
    }

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
