import { supportedChains } from '../../chains.ts'

export type Network =
  typeof supportedChains[keyof typeof supportedChains]['name']
