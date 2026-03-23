import { describe, expect, it } from "vitest";

import type { RuleEngineCondition } from "./types/rules";

import type { ConditionNameResolver } from "./ruleConditionToSearchQuery";
import { ruleConditionToSearchQuery } from "./ruleConditionToSearchQuery";

const resolver: ConditionNameResolver = {
  getTagName: (tagId: string) => {
    const map: Record<string, string> = {
      tag1: "recipes",
      tag2: "work stuff",
      tag3: "news",
    };
    return map[tagId];
  },
  getFeedName: (feedId: string) => {
    const map: Record<string, string> = {
      feed1: "HackerNews",
      feed2: "My Blog Feed",
    };
    return map[feedId];
  },
};

describe("ruleConditionToSearchQuery", () => {
  it("returns empty string for alwaysTrue", () => {
    expect(ruleConditionToSearchQuery({ type: "alwaysTrue" }, resolver)).toBe(
      "",
    );
  });

  it("converts urlContains", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "urlContains", str: "github.com" },
        resolver,
      ),
    ).toBe("url:github.com");
  });

  it("converts urlDoesNotContain", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "urlDoesNotContain", str: "spam" },
        resolver,
      ),
    ).toBe("-url:spam");
  });

  it("converts titleContains", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "titleContains", str: "hello world" },
        resolver,
      ),
    ).toBe('title:"hello world"');
  });

  it("converts titleDoesNotContain", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "titleDoesNotContain", str: "test" },
        resolver,
      ),
    ).toBe("-title:test");
  });

  it("converts importedFromFeed", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "importedFromFeed", feedId: "feed1" },
        resolver,
      ),
    ).toBe("feed:HackerNews");
  });

  it("converts importedFromFeed with spaces", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "importedFromFeed", feedId: "feed2" },
        resolver,
      ),
    ).toBe('feed:"My Blog Feed"');
  });

  it("converts bookmarkTypeIs link", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "bookmarkTypeIs", bookmarkType: "link" },
        resolver,
      ),
    ).toBe("is:link");
  });

  it("converts bookmarkTypeIs text", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "bookmarkTypeIs", bookmarkType: "text" },
        resolver,
      ),
    ).toBe("is:text");
  });

  it("converts bookmarkTypeIs asset", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "bookmarkTypeIs", bookmarkType: "asset" },
        resolver,
      ),
    ).toBe("is:media");
  });

  it("converts bookmarkSourceIs", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "bookmarkSourceIs", source: "rss" },
        resolver,
      ),
    ).toBe("source:rss");
  });

  it("converts hasTag", () => {
    expect(
      ruleConditionToSearchQuery({ type: "hasTag", tagId: "tag1" }, resolver),
    ).toBe("tag:recipes");
  });

  it("converts hasTag with spaces", () => {
    expect(
      ruleConditionToSearchQuery({ type: "hasTag", tagId: "tag2" }, resolver),
    ).toBe('tag:"work stuff"');
  });

  it("converts isFavourited", () => {
    expect(ruleConditionToSearchQuery({ type: "isFavourited" }, resolver)).toBe(
      "is:fav",
    );
  });

  it("converts isArchived", () => {
    expect(ruleConditionToSearchQuery({ type: "isArchived" }, resolver)).toBe(
      "is:archived",
    );
  });

  it("converts AND conditions", () => {
    const condition: RuleEngineCondition = {
      type: "and",
      conditions: [
        { type: "urlContains", str: "github.com" },
        { type: "isFavourited" },
      ],
    };
    expect(ruleConditionToSearchQuery(condition, resolver)).toBe(
      "(url:github.com is:fav)",
    );
  });

  it("converts OR conditions", () => {
    const condition: RuleEngineCondition = {
      type: "or",
      conditions: [
        { type: "urlContains", str: "github.com" },
        { type: "urlContains", str: "gitlab.com" },
      ],
    };
    expect(ruleConditionToSearchQuery(condition, resolver)).toBe(
      "(url:github.com or url:gitlab.com)",
    );
  });

  it("handles nested AND/OR", () => {
    const condition: RuleEngineCondition = {
      type: "and",
      conditions: [
        {
          type: "or",
          conditions: [
            { type: "urlContains", str: "github.com" },
            { type: "urlContains", str: "gitlab.com" },
          ],
        },
        { type: "hasTag", tagId: "tag3" },
      ],
    };
    expect(ruleConditionToSearchQuery(condition, resolver)).toBe(
      "((url:github.com or url:gitlab.com) tag:news)",
    );
  });

  it("returns empty string for empty AND", () => {
    expect(
      ruleConditionToSearchQuery({ type: "and", conditions: [] }, resolver),
    ).toBe("");
  });

  it("unwraps single-element groups", () => {
    const condition: RuleEngineCondition = {
      type: "and",
      conditions: [{ type: "isFavourited" }],
    };
    expect(ruleConditionToSearchQuery(condition, resolver)).toBe("is:fav");
  });

  it("returns null for empty string conditions", () => {
    expect(
      ruleConditionToSearchQuery({ type: "urlContains", str: "" }, resolver),
    ).toBe("");
  });

  it("returns null for unresolved tag", () => {
    expect(
      ruleConditionToSearchQuery(
        { type: "hasTag", tagId: "unknown" },
        resolver,
      ),
    ).toBe("");
  });
});
