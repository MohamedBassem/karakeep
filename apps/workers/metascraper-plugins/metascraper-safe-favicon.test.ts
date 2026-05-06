import metascraper from "metascraper";
import { describe, expect, test, vi } from "vitest";

vi.mock("network", () => ({
  getRandomProxy: vi.fn((proxies: string[]) => proxies[0]),
}));

vi.mock("@karakeep/shared/config", () => ({
  default: {
    proxy: {},
  },
}));

import metascraperSafeFavicon, {
  resolveSafeFaviconUrl,
} from "./metascraper-safe-favicon";

describe("metascraperSafeFavicon", () => {
  test("returns favicon candidates discovered by the upstream plugin without fetching them", async () => {
    const parser = metascraper([metascraperSafeFavicon()]);
    const meta = await parser({
      url: "https://example.com/articles/one",
      html: `
        <html>
          <head>
            <link rel="icon" href="/icon-64.png" sizes="64x64">
            <link rel="apple-touch-icon" href="/icon-256.png" sizes="256x256">
          </head>
        </html>
      `,
      validateUrl: false,
    });

    expect(meta.logo).toBe("https://example.com/icon-256.png");
  });

  test("does not reject private favicon URLs because it does not resolve or fetch them", async () => {
    const parser = metascraper([metascraperSafeFavicon()]);
    const meta = await parser({
      url: "https://example.com/articles/one",
      html: `
        <html>
          <head>
            <link rel="icon" href="http://127.0.0.1/admin.png" sizes="512x512">
            <link rel="icon" href="/public-icon.png" sizes="128x128">
          </head>
        </html>
      `,
      validateUrl: false,
    });

    expect(meta.logo).toBe("http://127.0.0.1/admin.png");
  });

  test("resolver only accepts syntactically valid http and https URLs", async () => {
    await expect(
      resolveSafeFaviconUrl("http://127.0.0.1/admin"),
    ).resolves.toEqual({
      url: "http://127.0.0.1/admin",
    });
    await expect(
      resolveSafeFaviconUrl("data:image/png;base64,abc"),
    ).resolves.toBe(undefined);
    await expect(resolveSafeFaviconUrl("not a url")).resolves.toBe(undefined);
  });
});
