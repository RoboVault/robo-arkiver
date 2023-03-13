import { Arkiver } from "../src/arkiver/arkiver.ts";
import { ManifestBuilder } from "../src/arkiver/manifest-builder.ts";
import qiERC20 from "./benqi/abis/qiERC20.ts";

const builder = new ManifestBuilder();

const avalancheBuilder = builder.addDataSource("avalanche");

avalancheBuilder
  .addContract(qiERC20)
  .addSource("0xF362feA9659cf036792c9cb02f8ff8198E21B4cB", 13995148n)
  .addEventHandler("Mint", async ({ event, client }) => {
    const { mintAmount, mintTokens, minter } = event.args;

    const { timestamp } = await client.getBlock({
      blockHash: event.blockHash!,
    });

    console.log(
      `${minter} minted ${mintTokens} for ${mintAmount} at ${timestamp}`,
    );
  });

const arkiver = new Arkiver(builder.build());
await arkiver.run();
