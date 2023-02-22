import { ethers, Point } from "../deps.ts";
import { EventHandler } from "@types";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
}) => {
  const [answer] = event.args;

  const decimals = await store.retrieve(
    `${contract.target.toString()}-decimals`,
    contract.decimals,
  ) as number;

  const pair = await store.retrieve(
    `${contract.target.toString()}-pair`,
    contract.description,
  ) as string;

  const timestamp = (await event.getBlock()).timestamp;

  const point = new Point("price")
    .tag("pair", pair)
    .floatField("price", parseFloat(ethers.formatUnits(answer, decimals)))
    .timestamp(timestamp);

  db.writer.writePoint(point);
};

export default handler;
