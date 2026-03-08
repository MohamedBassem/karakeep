import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const ErrorSchema = z
  .object({
    code: z.string().describe("A machine-readable error code."),
    message: z.string().describe("A human-readable error message."),
  })
  .openapi("Error");

export const RateLimitResponse = {
  description:
    "Too Many Requests — rate limit exceeded. Retry after the indicated number of seconds. The `Retry-After` header contains the number of seconds to wait before retrying.",
  headers: {
    "Retry-After": {
      description:
        "The number of seconds to wait before making another request.",
      schema: { type: "integer" },
    },
  },
  content: {
    "application/json": {
      schema: ErrorSchema,
    },
  },
} as const;

export const UnauthorizedResponse = {
  description:
    "Unauthorized — the Bearer token is missing, invalid, or expired.",
  content: {
    "text/plain": {
      schema: z.string().openapi({
        example: "Unauthorized",
      }),
    },
  },
} as const;
