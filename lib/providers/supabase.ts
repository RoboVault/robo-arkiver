import { ArkiveProvider } from "./types.ts";
import { RealtimeChannel, SupabaseClient } from "../../deps.ts";
import { getEnv, getSupabaseClient, rm, unpack } from "../utils.ts";
import { Arkive } from "../types.ts";

export class SupabaseProvider implements ArkiveProvider {
  private supabase: SupabaseClient;
  private newArkiveListener?: RealtimeChannel;

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

  public listenArkives(callback: (arkives: Arkive) => Promise<void>): void {
    const listener = this.supabase
      .channel("arkive-changes")
      .on<Arkive>(
        "postgres_changes",
        { event: "INSERT", schema: "public" },
        async (payload) => {
          await callback(payload.new);
        }
      )
      .subscribe();

    this.newArkiveListener = listener;
  }

  public async pullArkives(arkives: Arkive[]): Promise<void> {
    const promises = arkives.map(async (arkive) => {
      const path = `${arkive.owner_id}/${arkive.name}`;
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
    });
    await Promise.all(promises);
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
  }
}
