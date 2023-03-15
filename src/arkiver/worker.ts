import { ArkiveMessageEvent } from "../manager/types.ts";
import { logger } from "../logger.ts";
import { Arkiver } from "./arkiver.ts";

declare const self: Worker;
logger.info("worker started");

self.onmessage = async (e: MessageEvent<ArkiveMessageEvent>) => {
  logger.info("worker received message", e.data);
  switch (e.data.topic) {
    case "initArkive": {
      const { arkive, manifest } = e.data.data;
      logger.info("initializing arkive", arkive);
      const arkiver = new Arkiver(manifest, arkive);
      arkiver.addEventListener("synced", () => {
        self.postMessage({ topic: "synced", data: { arkive } });
      });
      await arkiver.run();
      break;
    }
  }
};
