import { ethers, Point } from "../deps.ts";
import { EventHandler } from "@types";
import { setAndForget, writeTvlChange } from "../shared.ts";
import { logger } from "../../../lib/deps.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
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
      ], contract.runner!.provider);
      return await underlyingContract.decimals();
    },
  );

  const withdrawAmount = parseFloat(ethers.formatUnits(
    redeemAmount,
    underlyingDecimals as number,
  ));

  const redeemAmountFloat = parseFloat(ethers.formatUnits(
    redeemTokens,
    decimals as number,
  ));

  const exchangeRate = withdrawAmount / redeemAmountFloat;

  const timestamp = (await event.getBlock()).timestamp;

  await writeTvlChange({
    db,
    store,
    account: redeemer,
    symbol,
    amount: -withdrawAmount,
    timestamp,
    blockHeight: event.blockNumber,
  });

  db.writer.writePoint(
    new Point("withdraw")
      .tag("withdrawer", redeemer)
      .tag("symbol", symbol)
      .tag("underlying", underlying)
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

  if (!isFinite(exchangeRate)) {
    logger.warning(
      `Exchange rate for ${symbol} is not finite: ${withdrawAmount} / ${redeemAmount} = ${exchangeRate}`,
    );
    return;
  }

  const erPoint = new Point("exchange_rate")
    .tag("symbol", symbol)
    .floatField("value", exchangeRate)
    .intField("blockHeight", event.blockNumber)
    .timestamp(timestamp);

  setAndForget({
    key: `${symbol}-exchangeRate`,
    value: exchangeRate,
    db,
    points: [erPoint],
    store,
  });
};

export default handler;
