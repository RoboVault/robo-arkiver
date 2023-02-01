import { SupabaseClient } from "../_shared/deps.ts";
import { Arkive } from "../_shared/types.ts";
import { getEnv } from "../_shared/utils.ts";
import { HttpError } from "../_shared/http_error.ts";
type PostParams = Partial<
  {
    userId: string;
    name: string;
    pkg: File;
    isPublic: string;
    update: "major" | "minor";
  }
>;

export const post = async (
  supabase: SupabaseClient,
  params: PostParams,
) => {
  const { userId, name, pkg, isPublic, update } = params;
  // check params
  if (!userId || !name || !pkg) {
    throw new HttpError(400, "Bad Request");
  }

  // check if arkive already exists
  const selectRes = await supabase
    .from(getEnv("ARKIVE_TABLE"))
    .select<
      "id, deployments(major_version, minor_version)",
      {
        id: string;
        deployments: { major_version: number; minor_version: number }[];
      }
    >("id, deployments(major_version, minor_version)")
    .eq("user_id", userId)
    .eq("name", name);

  if (selectRes.error) {
    throw selectRes.error;
  }

  if (selectRes.data.length > 0) {
    if (update === undefined) {
      throw new HttpError(400, "Bad Request");
    }
    return await updateDeployment(
      supabase,
      selectRes.data[0],
      {
        pkg,
        userId,
        update,
      },
    );
  } else {
    return await createDeployment(supabase, userId, name, pkg, isPublic);
  }
};

const updateDeployment = async (
  supabase: SupabaseClient,
  arkive: {
    id: string;
    deployments: { major_version: number; minor_version: number }[];
  },
  params: {
    userId: string;
    pkg: File;
    update: "major" | "minor";
  },
) => {
  // check params
  const { userId, pkg, update } = params;
  if (
    (update !== "major" && update !== "minor")
  ) {
    throw new HttpError(400, "Bad Request");
  }

  // get new version number
  const { major_version, minor_version } = arkive.deployments.reduce(
    (acc, cur) => {
      let minor_version: number;
      if (acc.major_version === cur.major_version) {
        minor_version = Math.max(acc.minor_version, cur.minor_version);
      } else if (acc.major_version < cur.major_version) {
        minor_version = cur.minor_version;
      } else {
        minor_version = acc.minor_version;
      }
      return {
        major_version: Math.max(acc.major_version, cur.major_version),
        minor_version,
      };
    },
    { major_version: 0, minor_version: 0 },
  );
  const newVersion = update === "minor"
    ? {
      major_version,
      minor_version: minor_version + 1,
    }
    : {
      major_version: major_version + 1,
      minor_version: 0,
    };

  const path =
    `${userId}/${arkive.id}/${newVersion.major_version}_${newVersion.minor_version}`;
  // upload package to storage
  const uploadRes = await supabase.storage
    .from(getEnv("ARKIVE_STORAGE"))
    .upload(`${path}.tar.gz`, pkg, {
      contentType: "application/gzip",
    });

  if (uploadRes.error) {
    throw uploadRes.error;
  }

  // insert new deployment into db
  const insertRes = await supabase
    .from(getEnv("DEPLOYMENTS_TABLE"))
    .insert({
      arkive_id: arkive.id,
      major_version: newVersion.major_version,
      minor_version: newVersion.minor_version,
      status: "pending",
      file_path: path,
    })
    .select<"*", Arkive>("*");

  if (insertRes.error) {
    throw insertRes.error;
  }

  return insertRes.data;
};

const createDeployment = async (
  supabase: SupabaseClient,
  userId: string,
  name: string,
  pkg: File,
  isPublic: string | undefined,
) => {
  // insert new row to arkive table
  const insertArkiveRes = await supabase
    .from(getEnv("ARKIVE_TABLE"))
    .insert({
      user_id: userId,
      name,
      public: isPublic !== undefined,
    })
    .select<"id", { id: string }>("id");

  if (insertArkiveRes.error) {
    throw insertArkiveRes.error;
  }

  // upload package to storage
  const path = `${userId}/${insertArkiveRes.data[0].id}/1_0`;
  const uploadRes = await supabase.storage
    .from(getEnv("ARKIVE_STORAGE"))
    .upload(`${path}.tar.gz`, pkg, {
      contentType: "application/gzip",
      upsert: true,
    });

  if (uploadRes.error) {
    throw uploadRes.error;
  }

  // insert new deployment into db
  const insertDeploymentRes = await supabase
    .from(getEnv("DEPLOYMENTS_TABLE"))
    .insert({
      arkive_id: insertArkiveRes.data[0].id,
      major_version: 1,
      minor_version: 0,
      status: "pending",
      file_path: path,
    });

  if (insertDeploymentRes.error) {
    throw insertDeploymentRes.error;
  }

  return insertDeploymentRes.data;
};
