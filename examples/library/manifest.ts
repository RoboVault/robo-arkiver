import { Manifest, Erc721Lib, type Erc721Opts } from './deps.ts'

const manifest = new Manifest('simple')

const opts: Erc721Opts = {
  contract: {"0xbd3531da5cf5857e7cfaa92426877b022e612cf8", 12876179},
  async: true
}

manifest
  .addChain('mainnet', { blockRange: 100n })
  .use([Erc721Lib.create(opts)])
    
export default manifest.build()
