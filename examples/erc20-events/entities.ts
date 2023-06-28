import { createEntity } from 'https://deno.land/x/robo_arkiver@v0.5.0/mod.ts'

// @note: "Index: true" enhances graphql queries
export const Transfer = createEntity('Transfer', {
  block: { type: Number, index: true },
  hash: String,
  from: String,
  to: String,
  value: String,
})

export const Approval = createEntity('Approval', {
  block: { type: Number, index: true },
  hash: String,
  owner: String,
  spender: String,
  value: String,
})
