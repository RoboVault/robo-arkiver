import { delay } from "../../deps.ts";
import { ArkiveMessageEvent } from "../types.ts";
import { Arkive } from "../types.ts";
import { ArkiveRunner } from "./arkive-runner.ts";

declare const self: Worker;

await delay(1000);

const arkiveRunners: { arkive: Arkive; runner: ArkiveRunner }[] = [];

self.onmessage = (e: MessageEvent<ArkiveMessageEvent>) => {
  const { topic, data } = e.data;

  switch (topic) {
    case "newArkives": {
      const { arkives } = data;
      for (const arkive of arkives) {
        addRunner(arkive);
      }
      break;
    }
  }
};

const addRunner = async (arkive: Arkive) => {
  const manifestPath = `../packages/${arkive.owner_id}/${arkive.name}/${arkive.version_number}/manifest.config.ts`;
  try {
    const { manifest } = await import(manifestPath);
    const runner = new ArkiveRunner(manifest, arkive);
    arkiveRunners.push({ runner, arkive });
    runner.run();
  } catch (e) {
    self.postMessage({
      topic: "workerError",
      data: {
        error: e,
        arkive,
      },
    });
  }
};
