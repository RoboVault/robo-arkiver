import { Manifest } from "./deps.ts";
import erc20 from "./abis/erc20.ts";
import { transferHandler } from "./handlers/transfer.ts";

const manifest = new Manifest("agnostic-events");

manifest
  .addChain("avalanche")
  .addContract(erc20)
  .addSource("*", 27347402n)
  .addEventHandler("Transfer", transferHandler);

export default manifest.build();
