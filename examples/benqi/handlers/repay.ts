import { EventHandler, Point } from "../deps.ts";
import {
  getTimestampFromEvent,
  getUnderlyingAmount,
  writeTvlChange,
} from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
  tempStore,
}) => {
  const [repayer, borrower, repayAmount] = event.args;
  const address = contract.target.toString();

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const formattedRepayAmount = await getUnderlyingAmount(
    repayAmount,
    contract,
    store,
  );

  const timestamp = getTimestampFromEvent(event, tempStore);

  await writeTvlChange({
    db,
    store,
    account: borrower,
    symbol,
    amount: formattedRepayAmount,
    timestamp,
    blockHeight: event.blockNumber,
  });

  timestamp.then((timestamp) => {
    db.writer.writePoint(
      new Point("repay")
        .tag("repayer", repayer)
        .tag("borrower", borrower)
        .tag("symbol", symbol)
        .floatField(
          "amount",
          formattedRepayAmount,
        )
        .intField("blockHeight", event.blockNumber)
        .timestamp(timestamp),
    );
  });
};

export default handler;
