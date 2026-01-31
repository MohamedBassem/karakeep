import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ConfigFile {
  apiKey?: string;
  serverAddr?: string;
}

const CONFIG_FILE_NAME = ".karakeeprc";

/**
 * Searches for a .karakeeprc config file in the following order:
 * 1. Current working directory
 * 2. Home directory
 *
 * Returns the parsed config or an empty object if no config file is found.
 */
export function loadConfigFile(): ConfigFile {
  const searchPaths = [
    path.join(process.cwd(), CONFIG_FILE_NAME),
    path.join(os.homedir(), CONFIG_FILE_NAME),
  ];

  for (const configPath of searchPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        return parseConfigFile(content, configPath);
      }
    } catch {
      // Continue to next path if there's an error reading the file
      continue;
    }
  }

  return {};
}

/**
 * Parses a .karakeeprc config file content.
 * Supports simple key=value format with comments (#) and empty lines.
 */
function parseConfigFile(content: string, filePath: string): ConfigFile {
  const config: ConfigFile = {};
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      console.warn(
        `Warning: Invalid line ${i + 1} in ${filePath}: missing '=' separator`,
      );
      continue;
    }

    const key = line.substring(0, equalsIndex).trim();
    let value = line.substring(equalsIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    switch (key.toLowerCase()) {
      case "api-key":
      case "api_key":
      case "apikey":
        config.apiKey = value;
        break;
      case "server-addr":
      case "server_addr":
      case "serveraddr":
      case "server":
        config.serverAddr = value;
        break;
      default:
        console.warn(`Warning: Unknown config key '${key}' in ${filePath}`);
    }
  }

  return config;
}

/**
 * Finds the path to the first existing .karakeeprc file.
 * Returns null if no config file is found.
 */
export function findConfigFilePath(): string | null {
  const searchPaths = [
    path.join(process.cwd(), CONFIG_FILE_NAME),
    path.join(os.homedir(), CONFIG_FILE_NAME),
  ];

  for (const configPath of searchPaths) {
    try {
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    } catch {
      continue;
    }
  }

  return null;
}
