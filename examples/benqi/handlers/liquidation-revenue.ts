import { EventHandler, Point } from "../deps.ts";
import {
  getPrice,
  getTimestampFromEvent,
  getUnderlyingAmount,
} from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
  tempStore,
}) => {
  const [adder, seizeAmount] = event.args;

  const address = contract.target.toString();

  if (adder.toLowerCase() !== address.toLowerCase()) return;

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const price = await getPrice(db, store, symbol);

  const formattedSeizeAmount = await getUnderlyingAmount(
    seizeAmount,
    contract,
    store,
  );
  const seizeAmountUsd = formattedSeizeAmount * price;

  const timestamp = getTimestampFromEvent(event, tempStore);

  timestamp.then((timestamp) => {
    db.writer.writePoint(
      new Point("revenue")
        .tag("symbol", symbol)
        .floatField(
          "liquidation",
          formattedSeizeAmount,
        )
        .floatField("liquidation-usd", seizeAmountUsd)
        .timestamp(timestamp),
    );
  });
};

export default handler;
