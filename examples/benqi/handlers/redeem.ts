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
  const [redeemer, redeemAmount, redeemTokens] = event.args;
  const address = contract.target.toString();

  const decimals = (await store.retrieve(
    `${address}-decimals`,
    contract.decimals,
  )) as number;

  const symbol = await store.retrieve(
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const withdrawAmount = await getUnderlyingAmount(
    redeemAmount,
    contract,
    store,
  );

  const redeemAmountFloat = parseFloat(ethers.formatUnits(
    redeemTokens,
    decimals as number,
  ));

  const exchangeRate = withdrawAmount / redeemAmountFloat;

  const timestamp = getTimestampFromEvent(event, tempStore);

  await writeTvlChange({
    db,
    store,
    account: redeemer,
    symbol,
    amount: -withdrawAmount,
    timestamp,
    blockHeight: event.blockNumber,
  });

  timestamp.then((timestamp) => {
    db.writer.writePoint(
      new Point("withdraw")
        .tag("withdrawer", redeemer)
        .tag("symbol", symbol)
        .floatField(
          "withdrawAmount",
          withdrawAmount,
        )
        .floatField(
          "redeemAmount",
          redeemAmount,
        )
        .intField("blockHeight", event.blockNumber)
        .timestamp(timestamp),
    );
  });

  if (!isFinite(exchangeRate)) {
    logger.warning(
      `Exchange rate for ${symbol} is not finite: ${withdrawAmount} / ${redeemAmount} = ${exchangeRate}`,
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
