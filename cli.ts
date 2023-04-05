import {
  Command,
  deploy,
  init,
  login,
  logout,
  remove,
  signup,
  start,
  upgrade,
} from "./cli/mod.ts";
import "https://deno.land/std@0.179.0/dotenv/load.ts";

export const version = "v0.3.5";

const command = new Command()
  .name("arkiver")
  .version(version)
  .description("The CLI tool for RoboArkiver");

// login
command
  .command("login", "Login to RoboArkiver")
  .option("-e, --email <email:string>", "Email address")
  .option("-p, --password <password:string>", "Password")
  .action(login.action);

// signup
command
  .command("signup", "Signup to RoboArkiver")
  .option("-e, --email <email:string>", "Email address")
  .option("-p, --password <password:string>", "Password")
  .option("-u, --username <username:string>", "Username")
  .action(signup.action);

// signout
command.command("logout", "Logout from RoboArkiver").action(logout.action);

// deploy
command
  .command("deploy", "Deploy arkive")
  .option("--public", "Make arkive public")
  .option("--major", "Deploy as major version")
  .arguments("<dir:string>")
  .action(deploy.action);

// delete
command
  .command("delete", "Delete arkive")
  .arguments("<id:number>")
  .action(async (_, id) => await remove.action(id));

// start
command
  .command("start", "Start local development arkiver")
  .arguments("<dir:string>")
  .option("-m, --manifest <manifest:string>", "Path to manifest file", {
    default: "./manifest.ts",
  })
  .option(
    "-c, --mongo-connection <mongoConnection:string>",
    "MongoDB Connection String",
  )
  .option("-r, --rpc-url <rpcUrl:string>", "RPC URL", {
    collect: true,
  })
  .option("--no-gql", "Disable GraphQL server")
  .action(start.action);

//init
command
  .command("init", "Initialize a new arkive project")
  .arguments("<dir:string>")
  .option("--overwrite", "Overwrite existing files")
  .action(init.action);

command
  .command("upgrade", "Upgrade arkiver to latest version")
  .action(async () => await upgrade.action(version));

if (import.meta.main) {
  await command.parse(Deno.args);
}
