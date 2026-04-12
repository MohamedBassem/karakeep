export interface GlobalOptions {
  apiKey?: string;
  serverAddr?: string;
  json?: true;
}

export let globalOpts: GlobalOptions | undefined = undefined;

export function setGlobalOptions(opts: GlobalOptions) {
  globalOpts = opts;
}

export function getGlobalOptions() {
  if (!globalOpts) {
    throw new Error("Global options are not initalized yet");
  }
  if (!globalOpts.apiKey) {
    throw new Error(
      "API key is not configured. Set it via --api-key, the KARAKEEP_API_KEY environment variable, or run 'karakeep configure'.",
    );
  }
  if (!globalOpts.serverAddr) {
    throw new Error(
      "Server address is not configured. Set it via --server-addr, the KARAKEEP_SERVER_ADDR environment variable, or run 'karakeep configure'.",
    );
  }
  return globalOpts as GlobalOptions & { apiKey: string; serverAddr: string };
}
