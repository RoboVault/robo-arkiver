import { Manifest } from './deps.ts'

const manifest = new Manifest('simple')

manifest
	.chain('mainnet')
	.addBlockHandler({
		startBlockHeight: 17379257n,
		blockInterval: 20,
		handler: () => {
			throw new Error('test')
		},
	})

export default manifest.build()
