import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface ConfigFile {
  apiKey?: string;
  serverAddr?: string;
}

function getConfigDir(): string {
  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming"),
      "karakeep",
    );
  }
  return path.join(
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
    "karakeep",
  );
}

export function getConfigFilePath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function loadConfig(): ConfigFile {
  const configPath = getConfigFilePath();
  try {
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content) as ConfigFile;
  } catch {
    return {};
  }
}
