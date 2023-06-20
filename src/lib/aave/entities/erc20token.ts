import { createEntity } from '../../../graphql/entity.ts'
import { Network } from '../types.ts'

export type Erc20TokenType = {
  id: string
  address: string
  network: string
  decimals: number
  symbol: string
}

export const Erc20Token = createEntity<Erc20TokenType>('Erc20Token', {
  id: String,
  address: String,
  network: String,
  decimals: Number,
  symbol: String,
})
