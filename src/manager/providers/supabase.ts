import { ArkiveProvider } from "./interfaces.ts";
import { RealtimeChannel, SupabaseClient } from "../../deps.ts";
import { getEnv, getSupabaseClient, rm, unpack } from "../../utils.ts";
import { Arkive, Deployment } from "../../arkiver/types.ts";
import { logger } from "../../logger.ts";

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

    const arkives: Arkive[] = arkivesRes.data.flatMap((arkive) => {
      // get highest deployment minor_version(s)
      const deployments = arkive.deployments.reduce((prev, curr) => {
        if (curr.status === "retired") {
          return prev;
        }

        const highestPrev = prev[curr.major_version];

        if (
          (!highestPrev || highestPrev.minor_version < curr.minor_version)
        ) {
          return {
            ...prev,
            [curr.major_version]: curr,
          };
        } else {
          return prev;
        }
      }, {} as Record<number, Deployment>);

      return Object.values(deployments).map((deployment) => ({
        id: arkive.id,
        name: arkive.name,
        user_id: arkive.user_id,
        public: arkive.public,
        created_at: arkive.created_at,
        deployment,
      }));
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
            logger.error(error, { source: "SupabaseProvider.listenNewArkive" });
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
    logger.info("closed");
  }
}
