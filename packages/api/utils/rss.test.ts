import { describe, expect, it } from "vitest";

import { BookmarkTypes } from "@karakeep/shared/types/bookmarks";
import type { ZPublicBookmark } from "@karakeep/shared/types/bookmarks";

import { toRSS } from "./rss";

const bookmark: ZPublicBookmark & { htmlContent: string } = {
  id: "bookmark-1",
  createdAt: new Date("2026-08-12T10:00:00.000Z"),
  modifiedAt: null,
  title: "A saved article",
  tags: ["reading"],
  description: "A short description",
  bannerImageUrl: null,
  content: {
    type: BookmarkTypes.LINK,
    url: "https://example.com/article",
  },
  htmlContent: "<article><p>Full content</p></article>",
};

const feedParams = {
  title: "Saved bookmarks",
  feedUrl: "https://karakeep.example/v1/rss/lists/list-1",
  siteUrl: "https://karakeep.example/dashboard/lists/list-1",
};

describe("toRSS", () => {
  it("does not include full content by default", () => {
    const rss = toRSS(feedParams, [bookmark]);

    expect(rss).toContain(
      "<description><![CDATA[A short description]]></description>",
    );
    expect(rss).not.toContain("<content:encoded>");
    expect(rss).not.toContain("Full content");
  });

  it("includes saved HTML as content:encoded when opted in", () => {
    const rss = toRSS(feedParams, [bookmark], { includeContent: true });

    expect(rss).toContain(
      "<content:encoded><![CDATA[<article><p>Full content</p></article>]]></content:encoded>",
    );
    expect(rss).toContain(
      "<description><![CDATA[A short description]]></description>",
    );
  });

  it("safely encodes CDATA terminators in saved HTML", () => {
    const rss = toRSS(
      feedParams,
      [{ ...bookmark, htmlContent: "<p>before ]]> after</p>" }],
      { includeContent: true },
    );

    expect(rss).toContain(
      "<content:encoded><![CDATA[<p>before ]]]]><![CDATA[> after</p>]]></content:encoded>",
    );
  });
});
