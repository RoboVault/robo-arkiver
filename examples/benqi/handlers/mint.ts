import { Point } from "https://esm.sh/@influxdata/influxdb-client@1.33.0";
import { ethers } from "npm:ethers@6.0.2";
import { EventHandler } from "@types";
import { getFromStore } from "@utils";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  provider,
}) => {
  if (!(event instanceof ethers.EventLog)) {
    return [];
  }

  const [minter, mintAmount, mintTokens] = event.args;
  const address = contract.target.toString();

  const decimals = (await getFromStore(
    store,
    `${address}-decimals`,
    contract.decimals,
  )) as number;

  const symbol = await getFromStore(
    store,
    `${address}-symbol`,
    contract.symbol,
  ) as string;

  const underlying = await getFromStore(
    store,
    `${address}-underlying`,
    async () => {
      if (!contract.interface.getFunction("underlying")) {
        return "AVAX";
      }
      return await contract.underlying();
    },
  ) as string;

  const underlyingDecimals = await getFromStore(
    store,
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

  const underlyingSymbol = await getFromStore(
    store,
    `${address}-underlyingSymbol`,
    async () => {
      if (underlying === "AVAX") {
        return "AVAX";
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function symbol() view returns (string)",
      ], provider);
      return await underlyingContract.symbol();
    },
  );

  const depositAmount = parseFloat(ethers.formatUnits(
    mintAmount,
    underlyingDecimals as number,
  ));

  const mintAmountFloat = parseFloat(ethers.formatUnits(
    mintTokens,
    decimals as number,
  ));

  return [
    new Point("deposit")
      .tag("depositor", minter)
      .tag("underlying", underlying)
      .tag("underlyingSymbol", underlyingSymbol as string)
      .tag("symbol", symbol)
      .floatField(
        "depositAmount",
        depositAmount,
      )
      .floatField(
        "mintAmount",
        mintAmountFloat,
      ),
    new Point("exchange_rate")
      .tag("symbol", symbol)
      .floatField(
        "exchangeRate",
        depositAmount / mintAmountFloat,
      ),
  ];
};

export default handler;
