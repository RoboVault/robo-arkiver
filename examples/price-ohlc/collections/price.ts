import { createCollection } from '../deps.ts'

export const Price = createCollection('Price', {
  timestamp: 'date',
  tags: {
    symbol: 'string',
  },
  values: {
    price: 'float',
    volume: 'float',
  },
})
