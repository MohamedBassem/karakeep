import readline from "node:readline";
import { getConfigFilePath, loadConfig, saveConfig } from "@/lib/config";
import { printStatusMessage } from "@/lib/output";
import { Command, Option } from "@commander-js/extra-typings";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export const configureCmd = new Command()
  .name("configure")
  .description("configure the CLI with server address and API key")
  .addOption(new Option("--addr <addr>", "the server address"))
  .addOption(new Option("--key <key>", "the API key"))
  .action(async (opts) => {
    const existing = loadConfig();

    const serverAddr =
      opts.addr ||
      (await prompt(
        `Server address${existing.serverAddr ? ` (${existing.serverAddr})` : ""}: `,
      )) ||
      existing.serverAddr;

    const apiKey =
      opts.key ||
      (await prompt(`API key${existing.apiKey ? " (****)" : ""}: `)) ||
      existing.apiKey;

    if (!serverAddr || !apiKey) {
      printStatusMessage(
        false,
        "Both server address and API key are required.",
      );
      process.exit(1);
    }

    saveConfig({ ...existing, serverAddr, apiKey });
    printStatusMessage(true, `Config saved to ${getConfigFilePath()}`);
  });
