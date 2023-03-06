import type { ArkiveManifest } from "@types";

export const manifest: ArkiveManifest = {
  dataSources: {
    avalanche: {
      contracts: [
        {
          abiPath: "abis/qiERC20.json",
          sources: [
            {
              address: "0xF362feA9659cf036792c9cb02f8ff8198E21B4cB", // qisAVAX
              startBlockHeight: 26530000,
            },
            {
              address: "0x89a415b3D20098E6A6C8f7a59001C67BD3129821", // qiBTC.b
              startBlockHeight: 16578216,
            },
            {
              address: "0xB715808a78F6041E46d61Cb123C9B4A27056AE9C", //qiUSDCn
              startBlockHeight: 26520000,
            },
            {
              address: "0xe194c4c5aC32a3C9ffDb358d9Bfd523a0B6d1568", // qiBTC
              startBlockHeight: 3046690,
            },
            {
              address: "0x334AD834Cd4481BB02d09615E7c11a00579A7909", // qiETH
              startBlockHeight: 3046701,
            },
            {
              address: "0x4e9f683A27a6BdAD3FC2764003759277e93696e6", // qiLINK
              startBlockHeight: 3046723,
            },
            {
              address: "0xc9e5999b8e75C3fEB117F6f73E664b9f3C8ca65C", // qiUSDT
              startBlockHeight: 3046718,
            },
            {
              address: "0xBEb5d47A3f720Ec0a390d04b4d41ED7d9688bC7F", // qiUSDC
              startBlockHeight: 3620405,
            },
            {
              address: "0xd8fcDa6ec4Bdc547C0827B8804e89aCd817d56EF", // qiUSDTn
              startBlockHeight: 13319600,
            },
            {
              address: "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D", // qiDAI
              startBlockHeight: 3046729,
            },
            {
              address: "0x872670CcAe8C19557cC9443Eff587D7086b8043A", // qiBUSD
              startBlockHeight: 21221137,
            },
            {
              address: "0x35Bd6aedA81a7E5FC7A7832490e71F757b0cD9Ce", // qiQI
              startBlockHeight: 4408541,
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
            {
              handler: "handlers/revenue.ts",
              name: "AccrueInterest",
            },
            {
              handler: "handlers/reserve-factor.ts",
              name: "NewReserveFactor",
            },
            {
              handler: "handlers/liquidation-revenue.ts",
              name: "ReservesAdded",
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
            {
              handler: "handlers/revenue.ts",
              name: "AccrueInterest",
            },
            {
              handler: "handlers/reserve-factor.ts",
              name: "NewReserveFactor",
            },
            {
              handler: "handlers/liquidation-revenue.ts",
              name: "ReservesAdded",
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
              startBlockHeight: 3043690,
            },
            {
              address: "0x9450A29eF091B625e976cE66f2A5818e20791999", // AVAX/USD
              startBlockHeight: 3043672,
            },
            {
              address: "0xEfaa69f461E0aaf0be1798b01371Daf14AC55eA8", // ETH/USD
              startBlockHeight: 3043701,
            },
            {
              address: "0xA2e5d3254F7d6E8C051Afb7F2aeea0dABf21F750", // LINK/USD
              startBlockHeight: 3043723,
            },
            {
              address: "0xB6f7e0129439829a3679BD06102fDCAA41ebeE5e", // QI/USD (phase 1)
              startBlockHeight: 4405541,
            },
            {
              address: "0x4bc3BeBb7eB60155f8b38771D9926d9A23dad5B5", // QI/USD (phase 2)
              startBlockHeight: 15033335,
            },
            {
              address: "0x2223338267fF42814d53aE1c02979164b0528fA4", // Calculated SAVAX/USD
              startBlockHeight: 13992148,
            },
          ],
        },
      ],
      blockHandlers: [
        {
          blockInterval: 43200, // ~ 2 seconds per block or 6 hours
          handlerPath: "handlers/total-tvl.ts",
          startBlockHeight: 3046672,
        },
      ],
    },
  },
};
