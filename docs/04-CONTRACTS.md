# 04: Contracts

Foundry project in `packages/contracts`. Solidity ^0.8.24. Drafts in `contracts/` at the repo root of this handoff; move them to `packages/contracts/src/`.

Keep contracts tiny and immutable. No upgrade proxies and no owner at all: `sealBySig` accepts a valid sealer signature from any sender, because the signature is the authorization, so there is no relayer address to manage.

Built in Milestone 1 at `packages/contracts/src`, compiled with solc 0.8.28 for `evm_version = cancun` (confirm Robinhood Chain's supported EVM version before the testnet deploy).

## AgentRegistry

Binds one agent to one wallet and authorizes a sealer key.

| Function | Who | Notes |
|---|---|---|
| `register(bytes32 salt, address sealer, string metaURI) → bytes32 agentId` | agent wallet (`msg.sender`) | Derives `agentId = keccak256(abi.encode(msg.sender, block.chainid, salt))`, so nobody can register or front-run another wallet's id. Fails if the wallet already has an active agent or the id was ever used. Stores `boundBlock = block.number`. |
| `agentIdFor(address wallet, bytes32 salt) → bytes32` | view | The same derivation, for clients |
| `setSealer(bytes32 agentId, address sealer)` | agent wallet | Rotate the recorder key. |
| `setMeta(bytes32 agentId, string metaURI)` | agent wallet | Name, runtime, model, market (JSON at a URL or `data:` URI). |
| `deactivate(bytes32 agentId)` | agent wallet | Ends the record forever. The id can never be reused, so a bad record can't be reset under the same id. |
| `agentOf(address wallet) → bytes32` | view | |
| `agents(bytes32) → (wallet, sealer, boundBlock, active, metaURI)` | view | |

Events: `Registered(agentId, wallet, sealer, metaURI)`, `SealerChanged(agentId, sealer)`, `MetaChanged(agentId, metaURI)`, `Deactivated(agentId)`.

`agentId` = `keccak256(abi.encode(wallet, chainId, salt))`; the CLI computes it with `agentIdFor` from `packages/protocol` and the contract derives the same value.

## SealRegistry

| Function | Who | Notes |
|---|---|---|
| `seal(bytes32 agentId, bytes32 root, uint64 firstSeq, uint32 count)` | the agent's current sealer | Requires active agent, `count > 0`, `root != 0`, `firstSeq == nextSeq[agentId]`. Sets `nextSeq += count`. Emits `Sealed`. |
| `sealBySig(SealRequest req, bytes sig)` | anyone (our relayer in practice) | Same checks; `sig` is the sealer's EIP-712 signature over `SealRequest{agentId, root, firstSeq, count, deadline}`. Rejects malleable (high-s) signatures. Lets us sponsor gas. |
| `nextSeq(bytes32) → uint64` | view | |
| `DOMAIN_SEPARATOR() → bytes32`, `hashSealRequest(SealRequest) → bytes32` | view | EIP-712 domain (recomputed if the chain id changes) and the digest a sealer signs; `sealRequestDigest` in `packages/protocol` produces the same digest |

Event: `Sealed(bytes32 indexed agentId, bytes32 root, uint64 firstSeq, uint32 count)`. The log's block number is the seal block. Roots are not stored (event only) to keep gas low.

## Tests

- Register, rotate sealer, deactivate, cannot re-register same id, one active agent per wallet.
- Seal sequence: correct `firstSeq` passes; gap or repeat reverts; wrong sealer reverts; inactive agent reverts.
- `sealBySig`: valid signature, expired deadline, replay with the same `firstSeq` reverts.
- Gas report for `seal` (target < 40k gas).
- `test/ProtocolVectors.t.sol` recomputes `packages/protocol/vectors.json` in Solidity and seals the vector records end to end.

Measured on anvil (full transaction gas): `register` 95,445; first `seal` of an agent 52,933 (initializes `nextSeq`); every later `seal` 35,845; relayed `sealBySig` 42,295.

## Deploy

Local: `pnpm --filter contracts deploy:local` starts anvil and deploys (add `-- --exit` to stop anvil afterwards).

1. Confirm Robinhood Chain testnet details from official docs.
2. `forge script script/Deploy.s.sol --rpc-url $RH_TESTNET_RPC --broadcast --verify` (Blockscout verifier).
3. Write addresses to `packages/contracts/deployments/<chainId>.json`; api, indexer and recorder read from there.
4. Mainnet only after ALFA approves. `Deploy.s.sol` refuses chain 4663 unless `BLACKBOX_ALLOW_MAINNET=true`.
