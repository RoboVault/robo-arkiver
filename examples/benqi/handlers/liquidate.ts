import { ethers, EventHandler, Point } from "../deps.ts";
import { getTimestampFromEvent, writeTvlChange } from "../shared.ts";

const handler: EventHandler = async ({
  contract,
  event,
  store,
  db,
  tempStore,
}) => {
  const [liquidator, borrower, repayAmount, qiTokenCollateral, seizeAmount] =
    event.args;
  const address = contract.target.toString();

  const symbol = await store.retrieve(
    `${address}-symbol`,
    async () => {
      if (!contract.interface.getFunction("symbol")) {
        return "AVAX";
      }
      return await contract.symbol();
    },
  ) as string;

  // ---------REPAY UNDERLYING---------
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
    `${underlying}-decimals`,
    async () => {
      if (underlying === "AVAX") {
        return 18;
      }
      const underlyingContract = new ethers.Contract(underlying, [
        "function decimals() view returns (uint8)",
      ], contract.runner);
      return await underlyingContract.decimals();
    },
  );

  // ---------SEIZE QITOKEN---------
  // contract of collateral qi token
  const qiTokenCollateralContract = new ethers.Contract(qiTokenCollateral, [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ], contract.runner);

  const qiTokenCollateralSymbol = await store.retrieve(
    `${qiTokenCollateral}-symbol`,
    qiTokenCollateralContract.symbol,
  ) as string;

  const qiTokenCollateralDecimals = await store.retrieve(
    `${qiTokenCollateral}-decimals`,
    qiTokenCollateralContract.decimals,
  ) as number;

  const formattedRepayAmount = parseFloat(ethers.formatUnits(
    repayAmount,
    underlyingDecimals as number,
  ));

  const formattedSeizeAmount = parseFloat(ethers.formatUnits(
    seizeAmount,
    qiTokenCollateralDecimals as number,
  ));

  const timestamp = getTimestampFromEvent(event, tempStore);

  await writeTvlChange({
    db,
    account: borrower,
    amount: formattedRepayAmount,
    blockHeight: event.blockNumber,
    timestamp,
    store,
    symbol,
  });

  timestamp.then((timestamp) =>
    db.writer.writePoint(
      new Point("liquidate")
        .tag("liquidator", liquidator)
        .tag("borrower", borrower)
        .tag("symbol", symbol)
        .tag("seizeAddress", qiTokenCollateral) // address of QiToken collateral being seized
        .tag("seizeSymbol", qiTokenCollateralSymbol) // symbol of QiToken collateral being seized
        .floatField(
          "repayAmount", // amount of underlying token being repaid
          formattedRepayAmount,
        )
        .floatField(
          "seizeAmount", // amount of QiToken collateral being seized
          formattedSeizeAmount,
        )
        .intField("blockHeight", event.blockNumber)
        .timestamp(timestamp),
    )
  );
};

export default handler;
