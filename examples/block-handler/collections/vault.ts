import { createCollection } from '../deps.ts'

export const VaultSnapshot = createCollection('Vault', {
  vault: 'string',
  name: 'string',
  symbol: 'string',
  block: 'number',
  timestamp: 'number',
  sharePrice: 'number',
})
