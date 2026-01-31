import { adminCmd } from "@/commands/admin";
import { bookmarkCmd } from "@/commands/bookmarks";
import { dumpCmd } from "@/commands/dump";
import { listsCmd } from "@/commands/lists";
import { migrateCmd } from "@/commands/migrate";
import { tagsCmd } from "@/commands/tags";
import { whoamiCmd } from "@/commands/whoami";
import { wipeCmd } from "@/commands/wipe";
import { loadConfigFile } from "@/lib/config";
import { setGlobalOptions } from "@/lib/globals";
import { Command, Option } from "@commander-js/extra-typings";

// Load config file and set environment variables as defaults
// Environment variables take precedence over config file values
const configFile = loadConfigFile();
if (configFile.apiKey && !process.env.KARAKEEP_API_KEY) {
  process.env.KARAKEEP_API_KEY = configFile.apiKey;
}
if (configFile.serverAddr && !process.env.KARAKEEP_SERVER_ADDR) {
  process.env.KARAKEEP_SERVER_ADDR = configFile.serverAddr;
}

const program = new Command()
  .name("karakeep")
  .description("A CLI interface to interact with the karakeep api")
  .addOption(
    new Option("--api-key <key>", "the API key to interact with the API")
      .makeOptionMandatory(true)
      .env("KARAKEEP_API_KEY"),
  )
  .addOption(
    new Option(
      "--server-addr <addr>",
      "the address of the server to connect to",
    )
      .makeOptionMandatory(true)
      .env("KARAKEEP_SERVER_ADDR"),
  )
  .addOption(new Option("--json", "to output the result as JSON"))
  .version(
    import.meta.env && "CLI_VERSION" in import.meta.env
      ? import.meta.env.CLI_VERSION
      : "0.0.0",
  );

program.addCommand(adminCmd);
program.addCommand(bookmarkCmd);
program.addCommand(listsCmd);
program.addCommand(tagsCmd);
program.addCommand(whoamiCmd);
program.addCommand(migrateCmd);
program.addCommand(wipeCmd);
program.addCommand(dumpCmd);

setGlobalOptions(program.opts());

program.parse();
