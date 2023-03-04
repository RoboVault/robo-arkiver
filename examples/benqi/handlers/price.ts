import { ethers, EventHandler } from "../deps.ts";
import { getTimestampFromEvent, setPrice } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
  tempStore,
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

  const timestamp = getTimestampFromEvent(event, tempStore);

  setPrice(
    db,
    store,
    pair,
    parseFloat(ethers.formatUnits(answer, decimals)),
    event.blockNumber,
    timestamp,
  );
};

export default handler;
