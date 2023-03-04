import { ethers, EventHandler, Point } from "../deps.ts";
import { getTimestampFromEvent, writeTvlChange } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  provider,
  db,
  tempStore,
}) => {
  const [repayer, borrower, repayAmount] = event.args;
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

  const formattedRepayAmount = parseFloat(ethers.formatUnits(
    repayAmount,
    underlyingDecimals as number,
  ));

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
        .tag("underlying", underlying)
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
