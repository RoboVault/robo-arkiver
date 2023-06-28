import { Manifest } from './deps.ts'
import erc20 from './erc20.ts'
import { Balance } from './entities.ts'
import { transferHandler } from './transferHandler.ts'

const manifest = new Manifest('simple')

manifest
  .addEntity(Balance)
  .addChain('mainnet', { blockRange: 100n })
  .addContract('ERC20', erc20)
  .addSources({ '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 16987011n })
  .addEventHandlers({ 'Transfer': transferHandler })

export default manifest.build()
