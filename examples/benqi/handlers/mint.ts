import { ethers, EventHandler, logger, Point } from "../deps.ts";
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
  const [minter, depositAmountRaw, mintAmountRaw] = event.args;
  const address = contract.target.toString();

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const decimals = (await store.retrieve(
    `${address}-decimals`,
    contract.decimals,
  )) as number;

  const depositAmount = await getUnderlyingAmount(
    depositAmountRaw,
    contract,
    store,
  );

  const mintAmount = parseFloat(ethers.formatUnits(
    mintAmountRaw,
    decimals,
  ));

  const exchangeRate = depositAmount / mintAmount;

  const timestamp = getTimestampFromEvent(event, tempStore);

  await writeTvlChange({
    db,
    store,
    account: minter,
    symbol,
    amount: depositAmount,
    timestamp,
    blockHeight: event.blockNumber,
  });

  timestamp.then((timestamp) => {
    db.writer.writePoints([
      new Point("deposit")
        .tag("symbol", symbol)
        .tag("depositor", minter)
        .floatField("amount", depositAmount)
        .floatField("mintAmount", mintAmount)
        .intField("blockHeight", event.blockNumber)
        .timestamp(timestamp),
    ]);
  });

  if (!isFinite(exchangeRate)) {
    logger.warning(
      `Exchange rate for ${symbol} is not finite: ${depositAmount} / ${mintAmount} = ${exchangeRate}`,
    );
    return;
  }

  timestamp.then((timestamp) => {
    const erPoint = new Point("exchange_rate")
      .tag("symbol", symbol)
      .floatField("value", exchangeRate)
      .intField("blockHeight", event.blockNumber)
      .timestamp(timestamp);
    db.writer.writePoint(erPoint);
  });

  store.set(`${symbol}-exchangeRate`, exchangeRate);
};

export default handler;
