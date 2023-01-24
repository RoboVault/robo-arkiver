import { SupabaseProvider } from "../providers/supabase.ts";
import { ArkiveProvider } from "../providers/types.ts";
import { Arkive, ArkiveMessageEvent } from "../types.ts";
import { rm } from "../utils.ts";
import { logError } from "../utils.ts";

export class ArkiveManager {
  private indexerWorker: Worker;
  private arkiveProvider: ArkiveProvider;

  constructor() {
    this.sendArkives = this.sendArkives.bind(this);
    this.pullPackages = this.pullPackages.bind(this);
    this.removePackage = this.removePackage.bind(this);
    this.indexerWorker = new Worker(
      new URL("../worker/mod.ts", import.meta.url),
      {
        type: "module",
        deno: {
          permissions: {
            env: [
              "INFLUXDB_URL",
              "INFLUXDB_TOKEN",
              "INFLUXDB_ORG",
              "INFLUXDB_BUCKET",
              "DENO_ENV",
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
      }
    );
    this.indexerWorker.onmessage = async (
      e: MessageEvent<ArkiveMessageEvent>
    ) => {
      if (e.data.topic === "workerError") {
        logError(e.data.data.error, {
          source: "worker-arkive-" + e.data.data.arkive.id,
        });
      } else if (e.data.topic === "synced") {
        try {
          await this.removePackage(e.data.data.arkive);
          await this.updateArkiveStatus(e.data.data.arkive, "retired");
        } catch (error) {
          logError(error, {
            source: "worker-arkive-synced-" + e.data.data.arkive.id,
          });
        }
      }
    };
    this.arkiveProvider = new SupabaseProvider();
  }

  public async init() {
    //  a1. Get all arkives from supabase
    const arkives = await this.getArkives();
    //  b1. Subscribe to new inserts and deletes in arkive table
    this.listenForNewArkives();
    //  a2. Aggregate arkives by owner and name and get the latest version
    const aggregatedArkives = this.aggregateArkives(arkives);
    //  a3. Pull each arkive package from supabase storage
    await this.pullPackages(aggregatedArkives);
    //  a4. Send aggregated arkives to indexer worker
    this.sendArkives(aggregatedArkives);
  }

  private async getArkives() {
    return await this.arkiveProvider.getArkives();
  }

  private listenForNewArkives() {
    this.arkiveProvider.listenArkives(async (arkive) => {
      await this.pullPackages([arkive]);
      this.sendArkives([arkive]);
    });
  }

  private sendArkives(arkives: Arkive[]) {
    this.indexerWorker.postMessage({ topic: "newArkives", data: { arkives } });
  }

  private aggregateArkives(arkives: Arkive[]) {
    const aggregatedMap = new Map<string, Arkive>();
    for (const arkive of arkives) {
      const key = `${arkive.owner_id}/${arkive.name}`;
      const existingArkive = aggregatedMap.get(key);
      if (
        !existingArkive ||
        existingArkive.version_number < arkive.version_number
      ) {
        aggregatedMap.set(key, arkive);
      }
    }
    return [...aggregatedMap.values()];
  }

  private async pullPackages(arkives: Arkive[]) {
    await this.arkiveProvider.pullArkives(arkives);
  }

  private async removePackage(arkive: Arkive) {
    const path = `${arkive.owner_id}/${arkive.name}`;
    const localDir = new URL(
      `../packages/${path}/${arkive.version_number}`,
      import.meta.url
    );
    await rm(localDir.pathname, { recursive: true });
  }

  private async updateArkiveStatus(arkive: Arkive, status: string) {
    await this.arkiveProvider.updateArkiveStatus(arkive, status);
  }

  public cleanup() {
    this.indexerWorker.terminate();
    this.arkiveProvider.close();
  }
}
