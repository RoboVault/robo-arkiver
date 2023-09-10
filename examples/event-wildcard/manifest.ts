import { Manifest } from './deps.ts'
import { ERC20_ABI } from './abis/erc20.ts'
import { transferHandler } from './handlers/transfer.ts'

const manifest = new Manifest('agnostic-events')

manifest
  .addChain('avalanche', (chain) =>
    chain
      .addContract({
        name: 'Erc20',
        abi: ERC20_ABI,
        sources: { '*': 27347402n },
        eventHandlers: { 'Transfer': transferHandler },
      }))

export default manifest.build()
