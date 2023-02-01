import type { IManifest } from "https://deno.land/x/robo_arkiver@v0.0.2/lib/types.ts";

const avalanche = {
  name: "avalanche",
  rpcUrl:
    "https://nd-043-363-211.p2pify.com/de88dadc15eed48dcd89c22c53bd0d28/ext/bc/C/rpc",
  blockRange: 3000,
};

export const manifest: IManifest = {
  dataSources: [
    {
      chain: avalanche,
      contracts: [
        {
          abiPath: "abis/erc20.json",
          sources: [
            {
              address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
              startBlockHeight: 25681956,
            }, // USDC
          ],
          eventQueries: [
            {
              name: "Transfer",
              handler: "handlers/transfer.ts",
            },
          ],
        },
      ],
    },
  ],
};
