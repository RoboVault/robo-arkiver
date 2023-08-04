import { Erc721Lib, type Erc721Opts, Manifest } from './deps.ts'

const manifest = new Manifest('libs')

const opts: Erc721Opts = {
  contract: { '0xbd3531da5cf5857e7cfaa92426877b022e612cf8': 12876179n },
  async: true,
}

manifest
  .addChain('mainnet', (chain) => chain.use([Erc721Lib.create(opts)]))

export default manifest.build()
