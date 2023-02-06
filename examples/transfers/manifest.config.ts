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
      blockHandlers: [
        {
          blockInterval: 1,
          handlerPath: "handlers/nativeTransfer.ts",
          startBlockHeight: 0,
        },
      ],
      contracts: [
        {
          abiPath: "abis/erc20.json",
          sources: [
            {
              address: "",
              startBlockHeight: -1,
            },
          ],
          eventQueries: [
            {
              handler: "handlers/ERC20Transfer.ts",
              name: "Transfer",
            },
          ],
        },
      ],
    },
  ],
};
