import { createCollection } from '../deps.ts'

export const Balance = createCollection('Balance', {
  account: 'string',
  balance: 'number',
  token: 'string',
})
