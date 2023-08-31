import { Manifest } from './deps.ts'
import { VaultSnapshot } from './collections/vault.ts'
import { snapshotVault } from './handlers/vault.ts'

const manifest = new Manifest('yearn-vaults')

manifest
  .addCollection(VaultSnapshot)
  .addChain('mainnet', (chain) =>
    chain
      .addBlockHandler({
        blockInterval: 1000,
        startBlockHeight: 12790000n,
        handler: snapshotVault,
      }))

export default manifest
  .build()
