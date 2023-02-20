import { ArkiveMessageEvent } from "@types";
import { devLog } from "@utils";
import { Arkiver } from "./arkiver.ts";

declare const self: Worker;
devLog("worker started");

self.onmessage = async (e: MessageEvent<ArkiveMessageEvent>) => {
  devLog("worker received message", e.data);
  switch (e.data.topic) {
    case "initArkive": {
      const { arkive, manifest } = e.data.data;
      devLog("initializing arkive", arkive);
      const arkiver = new Arkiver(manifest, arkive);
      arkiver.addEventListener("synced", () => {
        self.postMessage({ topic: "synced", data: { arkive } });
      });
      await arkiver.init();
      await arkiver.run();
      break;
    }
  }
};
