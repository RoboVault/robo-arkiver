import { delay } from "../../deps.ts";
import { Arkive, ArkiveMessageEvent } from "../types.ts";
import { TaskManager } from "./task-manager/mod.ts";

declare const self: Worker;

const taskManager = new TaskManager();
taskManager.addEventListener("synced", (e) => {
  const arkive = (e as CustomEvent<{ arkive: Arkive }>).detail.arkive;
  self.postMessage({ topic: "synced", data: { arkive } });
});

await delay(1000); // we wait 1 seconds for worker to be ready to listen to events

self.onmessage = (e: MessageEvent<ArkiveMessageEvent>) => {
  const { topic, data } = e.data;

  switch (topic) {
    case "newArkives": {
      const { arkives } = data;
      for (const arkive of arkives) {
        taskManager.addTask(arkive);
      }
      break;
    }
  }
};
