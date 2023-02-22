import { logger } from "@deps";
import { BlockHandlerFn } from "@types";

const handler: BlockHandlerFn = async ({
  block,
}) => {
  logger.info(
    `Running block handler for block ${block.number} from block handler 500...`,
  );
};

export default handler;
