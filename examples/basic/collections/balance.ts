import { createCollection } from '../deps.ts'

export const Balance = createCollection('Balance', {
  account: 'string',
  balance: 'float',
  token: 'string',
})
