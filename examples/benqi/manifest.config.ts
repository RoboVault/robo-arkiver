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
          abiPath: "abis/qiERC20.json",
          sources: [
            {
              address: "0xF362feA9659cf036792c9cb02f8ff8198E21B4cB", // qisAVAX
              startBlockHeight: 13995148,
            },
            {
              address: "0x89a415b3D20098E6A6C8f7a59001C67BD3129821", // qiBTC.b
              startBlockHeight: 16578216,
            },
            {
              address: "0xB715808a78F6041E46d61Cb123C9B4A27056AE9C", //qiUSDC
              startBlockHeight: 13319519,
            },
          ],
          eventQueries: [
            {
              handler: "handlers/mint.ts",
              name: "Mint",
            },
            {
              handler: "handlers/redeem.ts",
              name: "Redeem",
            },
            {
              handler: "handlers/borrow.ts",
              name: "Borrow",
            },
            {
              handler: "handlers/repay.ts",
              name: "RepayBorrow",
            },
            {
              handler: "handlers/liquidate.ts",
              name: "LiquidateBorrow",
            },
            {
              handler: "handlers/transfer.ts",
              name: "Transfer",
            },
          ],
        },
        {
          abiPath: "abis/qiAvax.json",
          sources: [
            {
              address: "0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c", // qiAVAX
              startBlockHeight: 3046672,
            },
          ],
          eventQueries: [
            {
              handler: "handlers/mint.ts",
              name: "Mint",
            },
            {
              handler: "handlers/redeem.ts",
              name: "Redeem",
            },
            {
              handler: "handlers/borrow.ts",
              name: "Borrow",
            },
            {
              handler: "handlers/repay.ts",
              name: "RepayBorrow",
            },
            {
              handler: "handlers/liquidate.ts",
              name: "LiquidateBorrow",
            },
            {
              handler: "handlers/transfer.ts",
              name: "Transfer",
            },
          ],
        },
        {
          abiPath: "abis/chainlinkAggregator.json",
          eventQueries: [
            {
              handler: "handlers/price.ts",
              name: "AnswerUpdated",
            },
          ],
          sources: [
            {
              address: "0x154baB1FC1D87fF641EeD0E9Bc0f8a50D880D2B6", // BTC/USD,
              startBlockHeight: 16578216,
            },
            {
              address: "0x9450A29eF091B625e976cE66f2A5818e20791999", // AVAX/USD
              startBlockHeight: 3046672,
            },
          ],
        },
      ],
    },
  ],
};
