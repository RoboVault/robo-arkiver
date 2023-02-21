import { ethers } from "npm:ethers@6.0.3";
import { EventHandler } from "@types";
import { getFromStore } from "@utils";
import { logger } from "@deps";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  provider,
}) => {
  const [_minter, mintAmount, mintTokens] = event.args;
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

  const exchangeRate = depositAmount / mintAmountFloat;

  logger.debug(
    `Deposit ${depositAmount} ${underlyingSymbol} for ${mintAmountFloat} ${symbol} at ${exchangeRate} ${underlyingSymbol}/${symbol}`,
  );
};

export default handler;
