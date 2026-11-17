# Deployments

`script/Deploy.s.sol` writes `<chainId>.json` here: contract addresses plus `startBlock`, the block the
indexer starts reading from. The api, indexer and recorder read these files.

- `31337.json` (local anvil) is regenerated on every `pnpm --filter contracts deploy:local` and is git-ignored.
- Testnet and mainnet files are committed once the contracts are deployed there.
