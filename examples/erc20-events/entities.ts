import { createEntity } from 'hhttps://deno.land/x/robo_arkiver@v0.4.20/mod.ts'

// @note: "Index: true" enhances graphql queries
export const Transfer = createEntity<any>('Transfer', {
  block: { type: Number, index: true },
  hash: String,
  from: String,
  to: String,
  value: String,
})

export const Approval = createEntity<any>('Approval', {
  block: { type: Number, index: true },
  hash: String,
  owner: String,
  spender: String,
  value: String,
})
