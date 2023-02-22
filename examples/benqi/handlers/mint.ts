import { ethers } from "npm:ethers@6.0.3";
import { EventHandler } from "@types";
import { Point } from "@deps";
import { writeTvlChange } from "../shared.ts";

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

  await writeTvlChange(db, minter, symbol, depositAmount, timestamp);

  db.writer.writePoints([
    new Point("deposit")
      .tag("symbol", symbol)
      .tag("underlying", underlying)
      .tag("depositor", minter)
      .floatField("amount", depositAmount)
      .floatField("mintAmount", mintAmount)
      .timestamp(timestamp),
    new Point("exchange_rate")
      .tag("symbol", symbol)
      .floatField("exchangeRate", exchangeRate)
      .timestamp(timestamp),
  ]);
};

export default handler;
