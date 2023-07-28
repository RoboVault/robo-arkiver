![Arkiver Logo](./img/arkiver_logo.png)

# Arkiver 
Seamlessly Develop, Deploy & Manage Data Pipelines for Web3 Applications

Fast and Fully Type-Safe Blockchain Indexer

# Links
 - [Arkiver App](https://arkiver.net)
 - [Docs](https://www.arkiver.net/docs/intro) 
 - [Quickstart](https://www.arkiver.net/docs/examples/index-erc20-events) 

# Features

- **Fast** - Maximize indexing speed by minimizing I/O and caching data in
  memory
- **Type-Safe** - End-to-end type-safety with TypeScript
- **Flexible** - Write custom handlers to process data however you want
- **Ergonomic** - Minimal configuration and easy to test locally
- **Multi-Chain** - Index multiple chains in a single Arkive
- **GraphQL** - Serve your data via a GraphQL API
- **Open-Source** - Arkiver is open-source and free to use
- **Self-Hosted** - Run Arkiver on your own infrastructure
- **Cloud-Hosted** - Deploy your Arkive to the Arkiver Hosted Service

### Pick your use-case

Deploy Next.js, Svelte, Remix, Astro, Solid, or any static site to AWS.

- [**ERC20 Events**](https://www.arkiver.net/docs/examples/index-erc20-events)
- [**Vault Share Price**](https://www.arkiver.net/docs/examples/block-handler-vault-snapshot)

# Overview

```typescript title="manifest.ts"
import { Manifest } from 'https://deno.land/x/robo_arkiver/mod.ts'
import { ERC20 } from './ERC20.ts'

const manifest = new Manifest('my-arkive')

manifest
	.chain('mainnet')
	.contract(ERC20)
	.addSources({ '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 16987011n })
	.addEventHandlers({
		'Transfer': ({ logger, event }) => {
			logger.info(`Transfer: ${event.from} -> ${event.to}: ${event.value}`)
		},
	})

export default manifest.build()
```

# License

[MIT](LICENSE) License

---

**Join our community** [Discord](https://discord.gg/robovault-865495351175282708) | [Twitter](https://twitter.com/robolabs_biz)