import { ArkiveProvider } from "./types.ts";
import { RealtimeChannel, SupabaseClient } from "../../deps.ts";
import { getEnv, getSupabaseClient, rm, unpack } from "../utils.ts";
import { Arkive } from "../types.ts";

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
      .select<"*", Arkive>("*");

    if (arkivesRes.error) {
      throw arkivesRes.error;
    }

    return arkivesRes.data;
  }

  public listenNewArkive(callback: (arkive: Arkive) => Promise<void>): void {
    const listener = this.supabase
      .channel("new-arkives")
      .on<Arkive>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: getEnv("SUPABASE_ARKIVE_TABLE"),
        },
        async (payload) => {
          console.log("new arkive heard", payload);
          await callback(payload.new);
        }
      )
      .subscribe();

    console.log("listening for new arkives");
    this.newArkiveListener = listener;
  }

  public listenDeletedArkive(
    callback: (arkive: Partial<Arkive>) => Promise<void>
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
          await callback(payload.old);
        }
      )
      .subscribe();

    this.deletedArkiveListener = listener;
  }

  public async pullArkive(arkive: Arkive): Promise<void> {
    const path = `${arkive.user_id}/${arkive.name}`;
    console.log(`Pulling ${path}...`);

    const { data, error } = await this.supabase.storage
      .from(getEnv("SUPABASE_ARKIVE_STORAGE"))
      .download(`${path}/${arkive.version_number}.tar.gz`);
    if (error) {
      throw error;
    }

    const localDir = new URL(
      `../packages/${path}/${arkive.version_number}`,
      import.meta.url
    );
    const localPath = new URL(
      `../packages/${path}/${arkive.version_number}.tar.gz`,
      import.meta.url
    );

    await Deno.mkdir(localDir, { recursive: true });
    await Deno.writeFile(localPath, new Uint8Array(await data.arrayBuffer()));
    await unpack(localPath.pathname, localDir.pathname);
    await rm(localPath.pathname);
  }

  public async updateArkiveStatus(
    arkive: Arkive,
    status: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from(getEnv("SUPABASE_ARKIVE_TABLE"))
      .update({ status })
      .eq("id", arkive.id);
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
    console.log("closed");
  }
}
