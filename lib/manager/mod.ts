import { SupabaseProvider } from "../providers/supabase.ts";
import { ArkiveProvider } from "../providers/types.ts";
import { Arkive, ArkiveMessageEvent, Deployment } from "@types";
import { devLog, rm } from "@utils";
import { logError } from "@utils";

export class ArkiveManager {
  // private indexerWorker: Worker;
  private arkiveProvider: ArkiveProvider;
  private arkives: { arkive: Arkive; worker: Worker }[] = [];

  constructor() {
    this.removeAllArkives = this.removeAllArkives.bind(this);
    this.addNewArkive = this.addNewArkive.bind(this);

    this.arkiveProvider = new SupabaseProvider();
  }

  public async init() {
    try {
      //  a1. Get all arkives from supabase
      const arkives = await this.getArkives();
      //  b1. Subscribe to new inserts and deletes in arkive table
      this.listenNewArkives();
      this.listenForDeletedArkives();
      //  a2. Aggregate arkives by owner and name and get the latest version
      // const aggregatedArkives = this.aggregateArkives(arkives);
      await Promise.all(
        arkives.map(async (arkive) => {
          await this.addNewArkive(arkive);
        }),
      );
    } catch (e) {
      logError(e, { source: "ArkiveManager.init" });
    }
  }

  private async getArkives() {
    devLog("fetching existing arkives");
    return await this.arkiveProvider.getArkives();
  }

  private listenNewArkives() {
    this.arkiveProvider.listenNewArkive(async (arkive: Arkive) => {
      devLog("new arkkive", arkive);
      // only remove previous versions if on the same major version.
      // new major versions will be removed once the new version is synced
      const previousArkives = this.getPreviousVersions(arkive);
      const sameMajor = previousArkives.filter(
        (a) =>
          a.arkive.deployment.major_version === arkive.deployment.major_version,
      );
      this.arkives = this.arkives.filter(
        (a) =>
          a.arkive.deployment.major_version !== arkive.deployment.major_version,
      );

      await Promise.all(sameMajor.map(async (arkive) => {
        await this.removeArkive(arkive);
      }));

      await this.addNewArkive(arkive);
    });
    devLog("listening for new arkives");
  }

  private listenForDeletedArkives() {
    this.arkiveProvider.listenDeletedArkive(async ({ id }) => {
      devLog("deleting arkives", id);
      await this.removeAllArkives(id);
      devLog("deleted arkives", id);
    });
    devLog("listening for deleted arkives");
  }

  private async addNewArkive(arkive: Arkive) {
    devLog("adding new arkive", arkive);
    await this.pullPackage(arkive);
    const worker = await this.spawnArkiverWorker(arkive);
    await this.updateDeploymentStatus(arkive, "syncing");
    this.arkives = [...this.arkives, { arkive, worker }];
    devLog("added new arkive", arkive);
  }

  // this is called when an arkive is deleted by the user which means the record is no longer in the tables
  private async removeAllArkives(id: number) {
    devLog("removing arkives", id);
    const deletedArkives = this.arkives.filter((a) => a.arkive.id === id);
    await Promise.all(deletedArkives.map(async (arkive) => {
      await this.removePackage(arkive.arkive);
      arkive.worker.terminate();
    }));
    this.arkives = this.arkives.filter((a) => a.arkive.id !== id);
    devLog("removed arkives", id);
  }

  // this is called in two places: when a new minor version is added (listenNewArkives)
  // and when a new major version has fully synced (worker.onmessage)
  private async removeArkive(arkive: { arkive: Arkive; worker: Worker }) {
    devLog("removing arkive", arkive);
    await this.removePackage(arkive.arkive);
    await this.updateDeploymentStatus(
      arkive.arkive,
      "retired",
    );
    arkive.worker.terminate();
  }

  private async spawnArkiverWorker(arkive: Arkive) {
    const manifestPath =
      `../packages/${arkive.user_id}/${arkive.id}/${arkive.deployment.major_version}_${arkive.deployment.minor_version}/manifest.config.ts`;
    const { manifest } = await import(manifestPath);

    const worker = new Worker(new URL("../arkiver/mod.ts", import.meta.url), {
      type: "module",
      deno: {
        permissions: {
          env: [
            "INFLUX_HOST",
            "INFLUX_TOKEN",
            "INFLUX_ORG",
            "INFLUX_BUCKET",
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
            // check if previous version is an older major version
            if (
              previousVersion.arkive.deployment.major_version <
                arkive.deployment.major_version
            ) {
              devLog("removing old major version", previousVersion.arkive);
              await this.removeArkive(previousVersion);
              devLog("removed old major version", previousVersion.arkive);
            }
          }
          await this.updateDeploymentStatus(
            e.data.data.arkive,
            "synced",
          );
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
        a.arkive.id === arkive.id && // same id
        (a.arkive.deployment.major_version < arkive.deployment.major_version || // older major version
          (a.arkive.deployment.major_version === // same major version but older minor version
              arkive.deployment.major_version &&
            a.arkive.deployment.minor_version <
              arkive.deployment.minor_version)),
    );
  }

  private async removePackage(arkive: Arkive) {
    const path = `${arkive.user_id}/${arkive.id}`;
    const localDir = new URL(
      `../packages/${path}/${arkive.deployment.major_version}_${arkive.deployment.minor_version}`,
      import.meta.url,
    );
    devLog("removing package", localDir.pathname);
    await rm(localDir.pathname, { recursive: true });
  }

  private async updateDeploymentStatus(
    arkive: Arkive,
    status: Deployment["status"],
  ) {
    await this.arkiveProvider.updateDeploymentStatus(arkive, status);
  }

  public cleanup() {
    this.arkives.forEach((arkive) => arkive.worker.terminate());
    this.arkiveProvider.close();
  }
}
