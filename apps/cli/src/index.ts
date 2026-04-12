import { adminCmd } from "@/commands/admin";
import { bookmarkCmd } from "@/commands/bookmarks";
import { configureCmd } from "@/commands/configure";
import { dumpCmd } from "@/commands/dump";
import { highlightsCmd } from "@/commands/highlights";
import { listsCmd } from "@/commands/lists";
import { migrateCmd } from "@/commands/migrate";
import { tagsCmd } from "@/commands/tags";
import { whoamiCmd } from "@/commands/whoami";
import { wipeCmd } from "@/commands/wipe";
import { loadConfig } from "@/lib/config";
import { setGlobalOptions } from "@/lib/globals";
import { Command, Option } from "@commander-js/extra-typings";

const config = loadConfig();

const apiKeyOption = new Option(
  "--api-key <key>",
  "the API key to interact with the API",
).env("KARAKEEP_API_KEY");
if (config.apiKey) {
  apiKeyOption.default(config.apiKey);
}

const serverAddrOption = new Option(
  "--server-addr <addr>",
  "the address of the server to connect to",
).env("KARAKEEP_SERVER_ADDR");
if (config.serverAddr) {
  serverAddrOption.default(config.serverAddr);
}

const program = new Command()
  .name("karakeep")
  .description("A CLI interface to interact with the karakeep api")
  .addOption(apiKeyOption)
  .addOption(serverAddrOption)
  .addOption(new Option("--json", "to output the result as JSON"))
  .version(
    import.meta.env && "CLI_VERSION" in import.meta.env
      ? import.meta.env.CLI_VERSION
      : "0.0.0",
  );

program.addCommand(adminCmd);
program.addCommand(bookmarkCmd);
program.addCommand(configureCmd);
program.addCommand(highlightsCmd);
program.addCommand(listsCmd);
program.addCommand(tagsCmd);
program.addCommand(whoamiCmd);
program.addCommand(migrateCmd);
program.addCommand(wipeCmd);
program.addCommand(dumpCmd);

setGlobalOptions(program.opts());

program.parse();
