import { ArkiveProvider } from "./types.ts";
import { RealtimeChannel, SupabaseClient } from "@deps";
import {
  devLog,
  getEnv,
  getSupabaseClient,
  logError,
  rm,
  unpack,
} from "../utils.ts";
import { Arkive, Deployment } from "@types";

interface RawArkive extends Omit<Arkive, "deployment"> {
  deployments: Deployment[];
}
export class SupabaseProvider implements ArkiveProvider {
  private supabase: SupabaseClient;
  private newArkiveListener?: RealtimeChannel;
  private deletedArkiveListener?: RealtimeChannel;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  public async getArkives(): Promise<Arkive[]> {
    const arkivesRes = await this.supabase
      .from(getEnv("SUPABASE_ARKIVE_TABLE"))
      .select<"*, deployments(*)", RawArkive>("*, deployments(*)");

    if (arkivesRes.error) {
      throw arkivesRes.error;
    }

    const arkives: Arkive[] = arkivesRes.data.map((arkive) => {
      // get highest deployment major_version and minor_version
      const deployment = arkive.deployments.reduce((prev, curr) => {
        if (
          curr.major_version > prev.major_version ||
          (curr.major_version === prev.major_version &&
            curr.minor_version > prev.minor_version)
        ) {
          return curr;
        } else {
          return prev;
        }
      });
      return {
        ...arkive,
        deployment,
      };
    });

    return arkives;
  }

  public listenNewArkive(
    callback: (arkive: Arkive) => Promise<void>,
  ): void {
    const listener = this.supabase
      .channel("new-deployment")
      .on<Omit<Deployment, "arkive">>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: getEnv("SUPABASE_DEPLOYMENTS_TABLE"),
        },
        async (payload) => {
          const { data, error: e } = await this.supabase.from(
            getEnv("SUPABASE_ARKIVE_TABLE"),
          )
            .select<"*", Omit<Arkive, "deployment">>("*")
            .eq("id", payload.new.arkive_id)
            .single();
          if (e) {
            const error = {
              ...e,
              name: "SupabaseProvider.listenNewArkive",
            } satisfies Error;
            logError(error, { source: "SupabaseProvider.listenNewArkive" });
            return;
          }
          const newArkive = {
            ...data,
            deployment: payload.new,
          };
          await callback(newArkive);
        },
      )
      .subscribe();

    this.newArkiveListener = listener;
  }

  public listenDeletedArkive(
    callback: (arkiveId: { id: number }) => Promise<void>,
  ): void {
    const listener = this.supabase
      .channel("deleted-arkives")
      .on<Arkive>(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: getEnv("SUPABASE_ARKIVE_TABLE"),
        },
        async (payload) => {
          await callback(payload.old as { id: number });
        },
      )
      .subscribe();

    this.deletedArkiveListener = listener;
  }

  public async pullArkive(arkive: Arkive): Promise<void> {
    const path = `${arkive.user_id}/${arkive.id}`;
    const version =
      `${arkive.deployment.major_version}_${arkive.deployment.minor_version}`;

    const { data, error } = await this.supabase.storage
      .from(getEnv("SUPABASE_ARKIVE_STORAGE"))
      .download(
        `${path}/${version}.tar.gz`,
      );
    if (error) {
      throw error;
    }

    const localDir = new URL(
      `../packages/${path}/${version}`,
      import.meta.url,
    );
    const localPath = new URL(
      `../packages/${path}/${version}.tar.gz`,
      import.meta.url,
    );

    await Deno.mkdir(localDir, { recursive: true });
    await Deno.writeFile(localPath, new Uint8Array(await data.arrayBuffer()));
    await unpack(localPath.pathname, localDir.pathname);
    await rm(localPath.pathname);
  }

  public async updateDeploymentStatus(
    arkive: Arkive,
    status: string,
  ): Promise<void> {
    const { error } = await this.supabase
      .from(getEnv("SUPABASE_DEPLOYMENTS_TABLE"))
      .update({ status })
      .eq("arkive_id", arkive.id)
      .eq("major_version", arkive.deployment.major_version)
      .eq("minor_version", arkive.deployment.minor_version);
    if (error) {
      throw error;
    }
  }

  public close(): void {
    if (this.newArkiveListener) {
      this.newArkiveListener.unsubscribe();
    }
    if (this.deletedArkiveListener) {
      this.deletedArkiveListener.unsubscribe();
    }
    devLog("closed");
  }
}
