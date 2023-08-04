import { Manifest } from './deps.ts'
import { ERC_20_ABI } from './Erc20.ts'
import { Balance } from './entities.ts'
import { transferHandler } from './transferHandler.ts'

const manifest = new Manifest('simple')

manifest
  .addEntity(Balance)
  .addChain('mainnet', (chain) =>
    chain
      .addContract({
        name: 'Erc20',
        abi: ERC_20_ABI,
        sources: { '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 16987011n },
        eventHandlers: { 'Transfer': transferHandler },
      }))

export default manifest.build()
