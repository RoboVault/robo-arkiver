import { Manifest } from "./deps.ts";
import erc20 from "./erc20.ts";
import { Balance } from "./entities.ts";
import { transferHandler } from "./transferHandler.ts";

const manifest = new Manifest("simple");

manifest
	.chain("avalanche")
	.contract(erc20)
	.addSources({ "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664": 27347402n })
	.addEventHandlers({ "Transfer": transferHandler });

export default manifest
	.addEntity(Balance)
	.build();
