import { Manifest } from "./deps.ts";
import erc20 from "./abis/erc20.ts";
import { Balance } from "./entities/balance.ts";
import { transferHandler } from "./handlers/transfer.ts";

const manifest = new Manifest();

manifest
  .addEntity(Balance)
  .addChain("avalanche")
  .addContract(erc20)
  .addSource("0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", 27347402n)
  .addEventHandler("Transfer", transferHandler);

export default manifest.build();
