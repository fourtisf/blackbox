# 04: Contracts

Foundry project in `packages/contracts`. Solidity ^0.8.24. Drafts in `contracts/` at the repo root of this handoff; move them to `packages/contracts/src/`.

Keep contracts tiny and immutable. No upgrade proxies, no admin keys over user data. The only owner power is setting the relayer address for sponsored seals.

## AgentRegistry

Binds one agent to one wallet and authorizes a sealer key.

| Function | Who | Notes |
|---|---|---|
| `register(bytes32 agentId, address sealer, string metaURI)` | agent wallet (`msg.sender`) | Fails if the wallet already has an active agent or `agentId` was ever used. Stores `boundBlock = block.number`. |
| `setSealer(bytes32 agentId, address sealer)` | agent wallet | Rotate the recorder key. |
| `setMeta(bytes32 agentId, string metaURI)` | agent wallet | Name, runtime, model, market (JSON at a URL or `data:` URI). |
| `deactivate(bytes32 agentId)` | agent wallet | Ends the record forever. The id can never be reused, so a bad record can't be reset under the same id. |
| `agentOf(address wallet) → bytes32` | view | |
| `agents(bytes32) → (wallet, sealer, boundBlock, active, metaURI)` | view | |

Events: `Registered(agentId, wallet, sealer, metaURI)`, `SealerChanged(agentId, sealer)`, `MetaChanged(agentId, metaURI)`, `Deactivated(agentId)`.

`agentId` = `keccak256(abi.encode(wallet, chainId, salt))` computed by the CLI.

## SealRegistry

| Function | Who | Notes |
|---|---|---|
| `seal(bytes32 agentId, bytes32 root, uint64 firstSeq, uint32 count)` | the agent's current sealer | Requires active agent, `count > 0`, `firstSeq == nextSeq[agentId]`. Sets `nextSeq += count`. Emits `Sealed`. |
| `sealBySig(SealRequest req, bytes sig)` | relayer | Same checks; `sig` is the sealer's EIP-712 signature over `SealRequest{agentId, root, firstSeq, count, deadline}`. Lets us sponsor gas. |
| `nextSeq(bytes32) → uint64` | view | |

Event: `Sealed(bytes32 indexed agentId, bytes32 root, uint64 firstSeq, uint32 count)`. The log's block number is the seal block. Roots are not stored (event only) to keep gas low.

## Tests

- Register, rotate sealer, deactivate, cannot re-register same id, one active agent per wallet.
- Seal sequence: correct `firstSeq` passes; gap or repeat reverts; wrong sealer reverts; inactive agent reverts.
- `sealBySig`: valid signature, expired deadline, replay with the same `firstSeq` reverts.
- Gas report for `seal` (target < 40k gas).

## Deploy

1. Confirm Robinhood Chain testnet details from official docs.
2. `forge script script/Deploy.s.sol --rpc-url $RH_TESTNET_RPC --broadcast --verify` (Blockscout verifier).
3. Write addresses to `packages/contracts/deployments/<chainId>.json`; api, indexer and recorder read from there.
4. Mainnet only after ALFA approves.
