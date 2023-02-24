import { ethers } from "npm:ethers@6.0.3";
import { EventHandler } from "@types";
import { logger, Point } from "@deps";
import { setAndForget, writeTvlChange } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  provider,
  db,
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

  const depositAmount = parseFloat(ethers.formatUnits(
    depositAmountRaw,
    underlyingDecimals as number,
  ));

  const mintAmount = parseFloat(ethers.formatUnits(
    mintAmountRaw,
    decimals,
  ));

  const exchangeRate = depositAmount / mintAmount;

  const timestamp = (await event.getBlock()).timestamp;

  await writeTvlChange({
    db,
    store,
    account: minter,
    symbol,
    amount: depositAmount,
    timestamp,
    blockHeight: event.blockNumber,
  });

  db.writer.writePoints([
    new Point("deposit")
      .tag("symbol", symbol)
      .tag("underlying", underlying)
      .tag("depositor", minter)
      .floatField("amount", depositAmount)
      .floatField("mintAmount", mintAmount)
      .intField("blockHeight", event.blockNumber)
      .timestamp(timestamp),
  ]);

  if (!isFinite(exchangeRate)) {
    logger.warning(
      `Exchange rate for ${symbol} is not finite: ${depositAmount} / ${mintAmount} = ${exchangeRate}`,
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
