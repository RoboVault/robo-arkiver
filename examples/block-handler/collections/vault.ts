import { createCollection } from '../deps.ts'

export const VaultSnapshot = createCollection('Vault', {
  vault: 'string',
  name: 'string',
  symbol: 'string',
  block: 'int',
  timestamp: 'int',
  sharePrice: 'float',
})
