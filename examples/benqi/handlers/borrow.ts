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
  const [borrower, borrowAmount] = event.args;
  const address = contract.target.toString();

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const formattedBorrowAmount = await getUnderlyingAmount(
    borrowAmount,
    contract,
    store,
  );

  const timestamp = getTimestampFromEvent(event, tempStore);

  await writeTvlChange({
    db,
    store,
    account: borrower,
    symbol,
    amount: -formattedBorrowAmount,
    timestamp,
    blockHeight: event.blockNumber,
  });

  timestamp.then((timestamp) => {
    db.writer.writePoint(
      new Point("borrow")
        .tag("borrower", borrower)
        .tag("symbol", symbol)
        .floatField("amount", formattedBorrowAmount)
        .intField("blockHeight", event.blockNumber)
        .timestamp(timestamp),
    );
  });
};

export default handler;
