import { Manifest } from 'https://deno.land/x/robo_arkiver@v0.4.15/mod.ts'
import erc20 from './erc20.ts'
import { Entities } from './entities.ts'
import { onTransfer } from './handlers.ts'

const manifest = new Manifest('frax-balances')

manifest
  .addEntities(Entities)
  .addChain('mainnet', { blockRange: 500n })
  .addContract(erc20)
  .addSources({ '0x853d955aCEf822Db058eb8505911ED77F175b99e': 11465581n })
  .addEventHandlers({ 'Transfer': onTransfer })

export default manifest.build()
