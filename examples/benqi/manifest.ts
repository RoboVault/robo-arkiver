import { ManifestBuilder } from "../../src/arkiver/manifest-builder.ts";
import chainlinkAggregator from "./abis/chainlinkAggregator.ts";
import qiAvax from "./abis/qiAvax.ts";
import qiERC20 from "./abis/qiERC20.ts";
import { mintHandler } from "./handlers/mint.ts";

const builder = new ManifestBuilder();

const avalancheBuilder = builder
  .addDataSource("avalanche");

avalancheBuilder
  .addContract(qiERC20)
  .addSources({
    "0xF362feA9659cf036792c9cb02f8ff8198E21B4cB": 13995148n, // qisAVAX
    "0x89a415b3D20098E6A6C8f7a59001C67BD3129821": 16578216n, // qiBTC.b
    "0xB715808a78F6041E46d61Cb123C9B4A27056AE9C": 13319519n, //qiUSDCn
    "0xe194c4c5aC32a3C9ffDb358d9Bfd523a0B6d1568": 3046690n, // qiBTC
    "0x334AD834Cd4481BB02d09615E7c11a00579A7909": 3046701n, // qiETH
    "0x4e9f683A27a6BdAD3FC2764003759277e93696e6": 3046723n, // qiLINK
    "0xc9e5999b8e75C3fEB117F6f73E664b9f3C8ca65C": 3046718n, // qiUSDT
    "0xBEb5d47A3f720Ec0a390d04b4d41ED7d9688bC7F": 3620405n, // qiUSDC
    "0xd8fcDa6ec4Bdc547C0827B8804e89aCd817d56EF": 13319600n, // qiUSDTn
    "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D": 3046729n, // qiDAI
    "0x872670CcAe8C19557cC9443Eff587D7086b8043A": 21221137n, // qiBUSD
    "0x35Bd6aedA81a7E5FC7A7832490e71F757b0cD9Ce": 4408541n, // qiQI
  })
  .addEventHandler("Mint", mintHandler);

avalancheBuilder
  .addContract(qiAvax)
  .addSource("0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c", 3046672n) // qiAVAX
  .addEventHandler("Mint", mintHandler);

avalancheBuilder
  .addContract(chainlinkAggregator)
  .addSources({
    "0x154baB1FC1D87fF641EeD0E9Bc0f8a50D880D2B6": 3043690n, // BTC/USD
    "0x9450A29eF091B625e976cE66f2A5818e20791999": 3043672n, // AVAX/USD
    "0xEfaa69f461E0aaf0be1798b01371Daf14AC55eA8": 3043701n, // ETH/USD
    "0xA2e5d3254F7d6E8C051Afb7F2aeea0dABf21F750": 3043723n, // LINK/USD
    "0xB6f7e0129439829a3679BD06102fDCAA41ebeE5e": 4405541n, // QI/USD (phase 1)
    "0x4bc3BeBb7eB60155f8b38771D9926d9A23dad5B5": 15033335n, // QI/USD (phase 2)
    "0x2223338267fF42814d53aE1c02979164b0528fA4": 13992148n, // Calculated SAVAX/USD
  })
  .addEventHandler("AnswerUpdated", async () => {}); // TODO: Add handler

avalancheBuilder
  .addBlockHandler({
    startBlockHeight: 3046672n,
    blockInterval: 43200,
    handler: async () => {}, // TODO: Add handler
  })
  .addBlockHandler({
    startBlockHeight: "live",
    blockInterval: 43200,
    handler: async () => {}, // TODO: Add handler
  });

export default builder.build();
