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

  const [from, to, value] = event.args;
  const address = contract.target.toString();

  if (
    (<string> from).toLowerCase() === address.toLowerCase() ||
    (<string> to).toLowerCase() === address.toLowerCase()
  ) {
    return [];
  }

  const decimals = (await getFromStore(
    store,
    `${address}-decimals`,
    contract.decimals,
  )) as number;

  const formattedValue = ethers.formatUnits(value, decimals);

  return [
    new Point("transfers")
      .tag("from", from)
      .tag("to", to)
      .floatField("total", parseFloat(formattedValue)),
  ];
};

export default handler;
