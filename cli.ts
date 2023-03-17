import {
  Command,
  deploy,
  login,
  logout,
  remove,
  signup,
  start,
} from "./cli/mod.ts";
import "https://deno.land/std@0.179.0/dotenv/load.ts";

const command = new Command()
  .name("arkiver")
  .version("0.1.0")
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
  .arguments("<dir:string> <arkiveName:string>")
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
  .option("--rpc-url <...rpcUrl:string>", "RPC URL")
  .action(start.action);

export default command;
