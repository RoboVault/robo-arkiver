import { ethers, EventHandler, Point } from "../deps.ts";
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

  const formattedRepayAmount = await getUnderlyingAmount(
    repayAmount,
    contract,
    store,
  );

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
