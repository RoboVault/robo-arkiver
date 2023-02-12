import { Point } from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
import { ethers } from "npm:ethers@6.0.2";
import { EventHandler } from "@types";
import { getFromStore } from "@utils";

const handler: EventHandler = async ({
  contract,
  event,
  store,
}) => {
  if (!(event instanceof ethers.EventLog)) {
    return [];
  }

  const [answer] = event.args;

  const decimals = await getFromStore(
    store,
    `${contract.target.toString()}-decimals`,
    contract.decimals,
  ) as number;

  const pair = await getFromStore(
    store,
    `${contract.target.toString()}-pair`,
    contract.description,
  ) as string;

  const point = new Point("price")
    .tag("pair", pair)
    .floatField("price", parseFloat(ethers.formatUnits(answer, decimals)));

  return [point];
};

export default handler;
