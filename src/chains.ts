import { 
	arbitrum,
	avalanche,
	mainnet,
	optimism,
	fantom,
	polygon,
	polygonMumbai
} from "npm:viem/chains";

export const supportedChains = {
  "ethereum": mainnet,
  avalanche,
  arbitrum,
  optimism,
  fantom,
  polygon,
  mumbai: polygonMumbai
} as const;
