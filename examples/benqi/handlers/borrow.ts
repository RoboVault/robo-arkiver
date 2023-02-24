import { ethers, Point } from "../deps.ts";
import { EventHandler } from "@types";
import { writeTvlChange } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  provider,
  db,
}) => {
  const [borrower, borrowAmount] = event.args;
  const address = contract.target.toString();

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const underlying = await store.retrieve(
    `${address}-underlying`,
    async () => {
      if (!contract.interface.getFunction("underlying")) {
        return "AVAX";
      }
      return await contract.underlying();
    },
  ) as string;

  const underlyingDecimals = await store.retrieve(
    `${address}-underlyingDecimals`,
    async () => {
      if (underlying === "AVAX") {
        return 18;
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function decimals() view returns (uint8)",
      ], provider);
      return await underlyingContract.decimals();
    },
  );

  const formattedBorrowAmount = parseFloat(ethers.formatUnits(
    borrowAmount,
    underlyingDecimals as number,
  ));

  const timestamp = (await event.getBlock()).timestamp;

  await writeTvlChange({
    db,
    store,
    account: borrower,
    symbol,
    amount: -formattedBorrowAmount,
    timestamp,
    blockHeight: event.blockNumber,
  });

  db.writer.writePoint(
    new Point("borrow")
      .tag("borrower", borrower)
      .tag("symbol", symbol)
      .floatField("amount", formattedBorrowAmount)
      .intField("blockHeight", event.blockNumber)
      .timestamp(timestamp),
  );
};

export default handler;
