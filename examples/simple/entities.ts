import { createEntity } from './deps.ts'

interface IBalance {
  account: string
  amount: number
  token: string
  timestamp: number
}

export const Balance = createEntity<IBalance>('Balance', {
  account: String,
  amount: {
    type: Number,
    index: true,
  },
  token: String,
  timestamp: {
    type: Number,
    index: true,
  },
})
