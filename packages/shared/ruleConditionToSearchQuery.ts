import type { RuleEngineCondition } from "./types/rules";

/**
 * A resolver that maps IDs to display names for constructing search queries.
 */
export interface ConditionNameResolver {
  getTagName(tagId: string): string | undefined;
  getFeedName(feedId: string): string | undefined;
}

function quoteIfNeeded(value: string): string {
  if (
    value.includes(" ") ||
    value.includes('"') ||
    value.includes("(") ||
    value.includes(")")
  ) {
    return `"${value.replace(/"/g, "")}"`;
  }
  return value;
}

function conditionToQueryParts(
  condition: RuleEngineCondition,
  resolver: ConditionNameResolver,
): string | null {
  switch (condition.type) {
    case "alwaysTrue":
      return null;
    case "urlContains":
      return condition.str ? `url:${quoteIfNeeded(condition.str)}` : null;
    case "urlDoesNotContain":
      return condition.str ? `-url:${quoteIfNeeded(condition.str)}` : null;
    case "titleContains":
      return condition.str ? `title:${quoteIfNeeded(condition.str)}` : null;
    case "titleDoesNotContain":
      return condition.str ? `-title:${quoteIfNeeded(condition.str)}` : null;
    case "importedFromFeed": {
      const feedName = resolver.getFeedName(condition.feedId);
      return feedName ? `feed:${quoteIfNeeded(feedName)}` : null;
    }
    case "bookmarkTypeIs": {
      const typeMap = {
        link: "is:link",
        text: "is:text",
        asset: "is:media",
      } as const;
      return typeMap[condition.bookmarkType];
    }
    case "bookmarkSourceIs":
      return `source:${condition.source}`;
    case "hasTag": {
      const tagName = resolver.getTagName(condition.tagId);
      return tagName ? `tag:${quoteIfNeeded(tagName)}` : null;
    }
    case "isFavourited":
      return "is:fav";
    case "isArchived":
      return "is:archived";
    case "and": {
      const parts = condition.conditions
        .map((c) => conditionToQueryParts(c, resolver))
        .filter((p): p is string => p !== null);
      if (parts.length === 0) return null;
      if (parts.length === 1) return parts[0];
      return `(${parts.join(" ")})`;
    }
    case "or": {
      const parts = condition.conditions
        .map((c) => conditionToQueryParts(c, resolver))
        .filter((p): p is string => p !== null);
      if (parts.length === 0) return null;
      if (parts.length === 1) return parts[0];
      return `(${parts.join(" or ")})`;
    }
  }
}

/**
 * Converts a rule engine condition into a search query string that can be
 * used on the search page to preview matching bookmarks.
 */
export function ruleConditionToSearchQuery(
  condition: RuleEngineCondition,
  resolver: ConditionNameResolver,
): string {
  return conditionToQueryParts(condition, resolver) ?? "";
}
