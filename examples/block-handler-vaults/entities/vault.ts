import { createEntity } from '../deps.ts'

export interface IVaultSnapshot {
  vault: string
  name: string
  symbol: string
  block: number
  timestamp: number
  sharePrice: number
}

export const VaultSnapshot = createEntity<IVaultSnapshot>('VaultSnapshot', {
  vault: String,
  name: String,
  symbol: String,
  block: { type: Number, index: true },
  timestamp: { type: Number, index: true },
  sharePrice: { type: Number, index: true },
})
