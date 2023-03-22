import { Manifest } from "./deps.ts";
import erc20 from "./erc20.ts";
import { Balance } from "./entities.ts";
import { transferHandler } from "./transferHandler.ts";

const manifest = new Manifest();

manifest
  .addEntity("Balance", Balance)
  .addChain("avalanche")
  .addContract(erc20)
  .addSource("0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", 27347402n)
  .addEventHandler("Transfer", transferHandler);

export default manifest.build();
