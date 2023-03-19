import { Manifest } from "./deps.ts";
import { GLP } from "./entities.ts";
import { GlpHandler } from "./gmxHandler.ts";

const manifest = new Manifest();

manifest
	.addEntity(GLP)
	.addChain("arbitrum")
	.addBlockHandler({ blockInterval: 2000, startBlockHeight: BigInt(60000000), handler: GlpHandler })// 

export default manifest.build();
