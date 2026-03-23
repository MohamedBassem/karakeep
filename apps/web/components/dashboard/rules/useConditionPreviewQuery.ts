import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import type { ConditionNameResolver } from "@karakeep/shared/ruleConditionToSearchQuery";
import { ruleConditionToSearchQuery } from "@karakeep/shared/ruleConditionToSearchQuery";
import type { RuleEngineCondition } from "@karakeep/shared/types/rules";
import { useTRPC } from "@karakeep/shared-react/trpc";

function collectTagIds(condition: RuleEngineCondition): string[] {
  switch (condition.type) {
    case "hasTag":
      return [condition.tagId];
    case "and":
    case "or":
      return condition.conditions.flatMap(collectTagIds);
    default:
      return [];
  }
}

function collectFeedIds(condition: RuleEngineCondition): string[] {
  switch (condition.type) {
    case "importedFromFeed":
      return [condition.feedId];
    case "and":
    case "or":
      return condition.conditions.flatMap(collectFeedIds);
    default:
      return [];
  }
}

export function useConditionPreviewQuery(condition: RuleEngineCondition): {
  query: string;
  isLoading: boolean;
} {
  const api = useTRPC();

  const tagIds = useMemo(
    () => [...new Set(collectTagIds(condition))].filter((id) => id.length > 0),
    [condition],
  );

  const feedIds = useMemo(
    () => [...new Set(collectFeedIds(condition))].filter((id) => id.length > 0),
    [condition],
  );

  const tagQueries = useQueries({
    queries: tagIds.map((tagId) =>
      api.tags.get.queryOptions(
        { tagId },
        { select: ({ id, name }) => ({ id, name }) },
      ),
    ),
  });

  const { data: feedsData, isLoading: isFeedsLoading } = useQuery(
    api.feeds.list.queryOptions(undefined, {
      select: (data) => data.feeds,
      enabled: feedIds.length > 0,
    }),
  );

  const isLoading =
    tagQueries.some((q) => q.isLoading) ||
    (feedIds.length > 0 && isFeedsLoading);

  const resolver: ConditionNameResolver = useMemo(() => {
    const tagMap = new Map<string, string>();
    for (const q of tagQueries) {
      if (q.data) {
        tagMap.set(q.data.id, q.data.name);
      }
    }

    const feedMap = new Map<string, string>();
    if (feedsData) {
      for (const feed of feedsData) {
        feedMap.set(feed.id, feed.name);
      }
    }

    return {
      getTagName: (tagId: string) => tagMap.get(tagId),
      getFeedName: (feedId: string) => feedMap.get(feedId),
    };
  }, [tagQueries, feedsData]);

  const query = useMemo(
    () => (isLoading ? "" : ruleConditionToSearchQuery(condition, resolver)),
    [condition, resolver, isLoading],
  );

  return { query, isLoading };
}
