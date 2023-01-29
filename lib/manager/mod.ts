import { SupabaseProvider } from "../providers/supabase.ts";
import { ArkiveProvider } from "../providers/types.ts";
import { Arkive, ArkiveMessageEvent } from "../types.ts";
import { devLog, rm } from "../utils.ts";
import { logError } from "../utils.ts";

export class ArkiveManager {
  // private indexerWorker: Worker;
  private arkiveProvider: ArkiveProvider;
  private arkives: { arkive: Arkive; worker: Worker }[] = [];

  constructor() {
    this.removeArkive = this.removeArkive.bind(this);
    this.addNewArkive = this.addNewArkive.bind(this);

    this.arkiveProvider = new SupabaseProvider();
  }

  public async init() {
    //  a1. Get all arkives from supabase
    const arkives = await this.getArkives();
    //  b1. Subscribe to new inserts and deletes in arkive table
    this.listenForNewArkives();
    this.listenForDeletedArkives();
    //  a2. Aggregate arkives by owner and name and get the latest version
    // const aggregatedArkives = this.aggregateArkives(arkives);
    await Promise.all(
      arkives.map(async (arkive) => {
        await this.addNewArkive(arkive);
      }),
    );
  }

  private async getArkives() {
    devLog("fetching existing arkives");
    return await this.arkiveProvider.getArkives();
  }

  private listenForNewArkives() {
    this.arkiveProvider.listenNewArkive(async (arkive) => {
      devLog("new arkive", arkive);
      await this.addNewArkive(arkive);
    });
    devLog("listening for new arkives");
  }

  private listenForDeletedArkives() {
    this.arkiveProvider.listenDeletedArkive(async (arkive) => {
      const fullArkive = this.arkives.find((a) => a.arkive.id === arkive.id);
      devLog("deleted arkive", fullArkive?.arkive);
      if (!fullArkive) {
        return;
      }
      await this.removeArkive(fullArkive.arkive);
      fullArkive.worker.terminate();
    });
    devLog("listening for deleted arkives");
  }

  // private aggregateArkives(arkives: Arkive[]) {
  //   const aggregatedMap = new Map<string, Arkive>();
  //   for (const arkive of arkives) {
  //     const key = `${arkive.user_id}/${arkive.name}`;
  //     const existingArkive = aggregatedMap.get(key);
  //     if (
  //       !existingArkive ||
  //       existingArkive.version_number < arkive.version_number
  //     ) {
  //       aggregatedMap.set(key, arkive);
  //     }
  //   }
  //   return [...aggregatedMap.values()];
  // }

  private async addNewArkive(arkive: Arkive) {
    devLog("adding new arkive", arkive);
    await this.pullPackage(arkive);
    const worker = await this.spawnArkiverWorker(arkive);
    this.arkives = [...this.arkives, { arkive, worker }];
    devLog("added new arkive", arkive);
  }

  private async removeArkive(arkive: Arkive) {
    devLog("removing arkive", arkive);
    this.arkives = this.arkives.filter((a) => a.arkive.id !== arkive.id);
    await this.removePackage(arkive);
    devLog("removed arkive", arkive);
  }

  private async spawnArkiverWorker(arkive: Arkive) {
    const manifestPath =
      `../packages/${arkive.user_id}/${arkive.name}/${arkive.version}/manifest.config.ts`;
    const { manifest } = await import(manifestPath);

    const worker = new Worker(new URL("../arkiver/mod.ts", import.meta.url), {
      type: "module",
      deno: {
        permissions: {
          env: [
            "INFLUXDB_URL",
            "INFLUXDB_TOKEN",
            "INFLUXDB_ORG",
            "INFLUXDB_BUCKET",
            "DENO_ENV",
            "NODE_ENV",
          ],
          hrtime: false,
          net: true,
          ffi: false,
          read: true,
          run: false,
          sys: false,
          write: false,
        },
      },
    });
    worker.onmessage = async (e: MessageEvent<ArkiveMessageEvent>) => {
      if (e.data.topic === "workerError") {
        logError(e.data.data.error, {
          source: "worker-arkive-" + e.data.data.arkive.id,
        });
      } else if (e.data.topic === "synced") {
        try {
          const previousVersions = this.getPreviousVersions(e.data.data.arkive);
          for (const previousVersion of previousVersions) {
            await this.removePackage(previousVersion.arkive);
            await this.updateArkiveStatus(previousVersion.arkive, "retired");
          }
        } catch (error) {
          logError(error, {
            source: "worker-arkive-synced-" + e.data.data.arkive.id,
          });
        }
      }
    };
    worker.onerror = (e) => {
      logError(e.error, {
        source: "worker-arkive-" + arkive.id,
      });
    };
    worker.postMessage({
      topic: "initArkive",
      data: {
        arkive,
        manifest,
      },
    });
    return worker;
  }

  private async pullPackage(arkive: Arkive) {
    await this.arkiveProvider.pullArkive(arkive);
  }

  private getPreviousVersions(arkive: Arkive) {
    return this.arkives.filter(
      (a) =>
        a.arkive.user_id === arkive.user_id &&
        a.arkive.name === arkive.name &&
        parseFloat(a.arkive.version) < parseFloat(arkive.version),
    );
  }

  private async removePackage(arkive: Arkive) {
    const path = `${arkive.user_id}/${arkive.name}`;
    const localDir = new URL(
      `../packages/${path}/${arkive.version}`,
      import.meta.url,
    );
    await rm(localDir.pathname, { recursive: true });
  }

  private async updateArkiveStatus(arkive: Arkive, status: string) {
    await this.arkiveProvider.updateArkiveStatus(arkive, status);
  }

  public cleanup() {
    this.arkives.forEach((arkive) => arkive.worker.terminate());
    this.arkiveProvider.close();
  }
}
