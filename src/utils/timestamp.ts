import { Store } from "../arkiver/store.ts";
import { PublicClient } from "../deps.ts";

/**
 * Returns the closest timestamp to the given timestamp that is divisible by the given interval (in ms) rounded down.
 * @param timestamp
 * @param interval
 * @returns
 */
export const getClosestTimestamp = (timestamp: number, interval: number) => {
  return timestamp - (timestamp % interval);
};

export const getTimestampFromBlockNumber = async (
  params: {
    client: PublicClient;
    store: Store;
    blockNumber: bigint;
    group?: {
      blockTimeMs: number;
      groupTimeMs: number;
    };
  },
) => {
  let adjustedBlockNumber = params.blockNumber;

  if (params.group) {
    const blocks = Math.floor(
      params.group.groupTimeMs / params.group.blockTimeMs,
    );
    adjustedBlockNumber = params.blockNumber -
      (params.blockNumber % BigInt(blocks));
  }

  return Number(
    await params.store.retrieve(
      `blockNumberTimestamp:${adjustedBlockNumber}`,
      async () => {
        const block = await params.client.getBlock({
          blockNumber: adjustedBlockNumber,
        });
        return block.timestamp;
      },
    ),
  ) * 1000;
};
