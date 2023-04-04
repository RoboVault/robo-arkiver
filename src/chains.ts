import { arbitrum, avalanche, mainnet } from "npm:viem/chains";

export const supportedChains = {
  "avalanche": avalanche,
  "ethereum": mainnet,
  "arbitrum": arbitrum,
} as const;
