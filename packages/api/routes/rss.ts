import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import serverConfig from "@karakeep/shared/config";
import { MAX_NUM_BOOKMARKS_PER_PAGE } from "@karakeep/shared/types/bookmarks";
import { List } from "@karakeep/trpc/models/lists";

import { unauthedMiddleware } from "../middlewares/auth";
import { toRSS } from "../utils/rss";
import { zIncludeContentSearchParamsSchema } from "../utils/types";

const app = new Hono().get(
  "/lists/:listId",
  zValidator(
    "query",
    z
      .object({
        token: z.string().min(1).optional(),
        limit: z.coerce
          .number()
          .min(1)
          .max(MAX_NUM_BOOKMARKS_PER_PAGE)
          .optional(),
      })
      .extend(zIncludeContentSearchParamsSchema.shape),
  ),
  unauthedMiddleware,
  async (c) => {
    const listId = c.req.param("listId");
    const searchParams = c.req.valid("query");
    const token = searchParams.token;

    const res = await List.getPublicListContents(
      c.var.ctx,
      listId,
      token ?? null,
      {
        limit: searchParams.limit ?? 20,
        order: "desc",
        cursor: null,
        includeContent: searchParams.includeContent,
      },
    );
    const list = res.list;

    const rssFeed = toRSS(
      {
        title: `Bookmarks from ${list.icon} ${list.name}`,
        feedUrl: `${serverConfig.publicApiUrl}/v1/rss/lists/${listId}`,
        siteUrl: `${serverConfig.publicUrl}/dashboard/lists/${listId}`,
        description: list.description ?? undefined,
      },
      res.bookmarks,
      { includeContent: searchParams.includeContent },
    );

    c.header("Content-Type", "application/rss+xml");
    return c.body(rssFeed);
  },
);

export default app;
