import {
  checkVersion,
  Command,
  deploy,
  init,
  keygen,
  keyls,
  keyrm,
  list,
  login,
  logout,
  remove,
  signup,
  start,
  upgrade,
  util,
} from './cli/mod.ts'
import 'https://deno.land/std@0.179.0/dotenv/load.ts'

export const version = 'v0.4.15'

const command = new Command()
  .name('arkiver')
  .version(version)
  .description('The CLI tool for RoboArkiver')

// login
command
  .command('login', 'Login to RoboArkiver')
  .option('-e, --email <email:string>', 'Email address')
  .option('-p, --password <password:string>', 'Password')
  .action(async (opts, ...args) => {
    await checkVersion(version)
    await login.action(opts, ...args)
  })

// signup
command
  .command('signup', 'Signup to RoboArkiver')
  .option('-e, --email <email:string>', 'Email address')
  .option('-p, --password <password:string>', 'Password')
  .option('-u, --username <username:string>', 'Username')
  .action(async (opts, ...args) => {
    await checkVersion(version)
    await signup.action(opts, ...args)
  })

// signout
command.command('logout', 'Logout from RoboArkiver').action(logout.action)

// deploy
command
  .command('deploy', 'Deploy arkive')
  .option('--public', 'Make arkive public')
  .option('--major', 'Deploy as major version')
  .option('--env <env:string>', 'Environment to deploy to')
  .arguments('<dir:string>')
  .action(async (opts, ...args) => {
    await checkVersion(version)
    await deploy.action(opts, ...args)
  })

// delete
command
  .command('delete', 'Delete arkive')
  .arguments('<dir:string>')
  .option('-m, --manifest <manifest:string>', 'Path to manifest file', {
    default: './manifest.ts',
  })
  .action(async (opts, dir) => {
    await checkVersion(version)
    await remove.action(opts, dir)
  })

// start
command
  .command('start', 'Start local development arkiver')
  .arguments('<dir:string>')
  .option('-m, --manifest <manifest:string>', 'Path to manifest file', {
    default: './manifest.ts',
  })
  .option(
    '-c, --mongo-connection <mongoConnection:string>',
    'MongoDB Connection String',
  )
  .option('-r, --rpc-url <rpcUrl:string>', 'RPC URL', {
    collect: true,
  })
  .option('--no-gql', 'Disable GraphQL server')
  .option('--no-db', 'Don\'t connect to MongoDB')
  .option('--log-level <logLevel:string>', 'Log level', {
    default: 'INFO',
  })
  .option('--gql-only', 'Only start GraphQL server')
  .action(async (opts, ...args) => {
    util.logHeader(version)
    await checkVersion(version)
    await start.action(opts, ...args)
  })

// init
command
  .command('init', 'Initialize a new arkive project')
  .action(async () => {
    util.logHeader(version)
    await checkVersion(version)
    await init.action()
  })

// upgrade
command
  .command('upgrade', 'Upgrade arkiver to latest version')
  .action(async () => await upgrade.action(version))

// list
command
  .command('list', 'List all your arkives')
  .option('-A, --all', 'List all arkives')
  .option('-s, --status <status>', 'Filter by status')
  .action(async (opts) => {
    await checkVersion(version)
    await list.action(opts)
  })

// keygen
command
  .command('keygen', 'Generate a new API key')
  .action(keygen.action)

// keyrm
command
  .command('keyrm', 'Delete an API key')
  .arguments('<key:string>')
  .action(async (_, key) => {
    await keyrm.action(key)
  })

command
  .command('keyls', 'List all API keys')
  .action(keyls.action)

if (import.meta.main) {
  await command.parse(Deno.args)
}
