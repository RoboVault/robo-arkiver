import { createEntity } from 'https://deno.land/x/robo_arkiver@v0.4.20/mod.ts'

// @note: "Index: true" enhances graphql queries

// Contains all transfer events
export const Transfer = createEntity('Transfer', {
  token: String,
  block: { type: Number, index: true },
  hash: String,
  from: String,
  to: String,
  value: Number,
})

// Contains current balance for all users
export const Balance = createEntity('Balance', {
  token: String,
  user: String,
  balance: String,
})

// Contains all balance changes for every user
export const BalanceHistory = createEntity('BalanceHistory', {
  token: String,
  block: { type: Number, index: true },
  user: String,
  balance: String,
})

export const Entities = [Balance, BalanceHistory, Transfer]
