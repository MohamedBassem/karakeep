import { Hono } from "hono";

import serverConfig from "@karakeep/shared/config";
import { Context } from "@karakeep/trpc";

const clientConfig = new Hono<{
  Variables: {
    ctx: Context;
  };
}>().get("/", (c) => {
  return c.json({
    subscriptionsEnabled: serverConfig.stripe.isConfigured,
    inferenceEnabled: serverConfig.inference.isConfigured,
    serverVersion: serverConfig.serverVersion ?? "unknown",
  });
});

export default clientConfig;
