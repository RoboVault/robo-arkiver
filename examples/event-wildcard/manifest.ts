import { Manifest } from './deps.ts'
import erc20 from './abis/erc20.ts'
import { transferHandler } from './handlers/transfer.ts'

const manifest = new Manifest('agnostic-events')

manifest
  .addChain('avalanche', { blockRange: 100n })
  .addContract('ERC20', erc20)
  .addSources({ '*': 27347402n })
  .addEventHandlers({ 'Transfer': transferHandler })

export default manifest.build()
