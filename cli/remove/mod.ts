import { SUPABASE_FUNCTIONS_URL } from "../constants.ts";
import { wait } from "../deps.ts";
import { login } from "../login/mod.ts";
import { getSupabaseClient } from "../utils.ts";

export const action = async (id: number) => {
	const spinner = wait("Deleting...").start();

	try {
		// delete package
		const supabase = getSupabaseClient();
		const sessionRes = await supabase.auth.getSession();

		if (!sessionRes.data.session) {
			await login({}, supabase);
		}

		const userRes = await supabase.auth.getUser();
		if (userRes.error) {
			throw userRes.error;
		}

		if (!sessionRes.data.session) {
			throw new Error("Not logged in");
		}

		const headers = new Headers();
		headers.append(
			"Authorization",
			`Bearer ${sessionRes.data.session.access_token}`,
		);

		const deleteRes = await fetch(
			new URL(`/arkives/${id}`, SUPABASE_FUNCTIONS_URL),
			{
				method: "DELETE",
				headers,
			},
		);

		if (!deleteRes.ok) {
			throw new Error(await deleteRes.text());
		}

		spinner.succeed("Deleted successfully!");
	} catch (error) {
		spinner.fail("Deletion failed: " + error.message);
		console.error(error);
	}

	Deno.exit();
};
