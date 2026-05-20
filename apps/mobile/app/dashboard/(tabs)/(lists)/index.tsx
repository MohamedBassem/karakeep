import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  PlatformColor,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Link, router } from "expo-router";
import FullPageError from "@/components/FullPageError";
import ChevronRight from "@/components/ui/ChevronRight";
import { FAB } from "@/components/ui/FAB";
import FullPageSpinner from "@/components/ui/FullPageSpinner";
import { Text } from "@/components/ui/Text";
import { useColorScheme } from "@/lib/useColorScheme";
import { condProps } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";

import { useBookmarkLists } from "@karakeep/shared-react/hooks/lists";
import { useTRPC } from "@karakeep/shared-react/trpc";
import { ZBookmarkListTreeNode } from "@karakeep/shared/utils/listUtils";

interface ListLink {
  id: string;
  logo: string;
  name: string;
  href: string;
  level: number;
  parent?: string;
  numChildren: number;
  collapsed: boolean;
  isSharedSection?: boolean;
  numBookmarks?: number;
}

function traverseTree(
  node: ZBookmarkListTreeNode,
  links: ListLink[],
  showChildrenOf: Record<string, boolean>,
  listStats?: Map<string, number>,
  parent?: string,
  level = 0,
) {
  links.push({
    id: node.item.id,
    logo: node.item.icon,
    name: node.item.name,
    href: `/dashboard/lists/${node.item.id}`,
    level,
    parent,
    numChildren: node.children?.length ?? 0,
    collapsed: !showChildrenOf[node.item.id],
    numBookmarks: listStats?.get(node.item.id),
  });

  if (node.children && showChildrenOf[node.item.id]) {
    node.children.forEach((child) =>
      traverseTree(
        child,
        links,
        showChildrenOf,
        listStats,
        node.item.id,
        level + 1,
      ),
    );
  }
}

export default function Lists() {
  const { colors } = useColorScheme();
  const [refreshing, setRefreshing] = useState(false);
  const { data: lists, isPending, error, refetch } = useBookmarkLists();
  const [showChildrenOf, setShowChildrenOf] = useState<Record<string, boolean>>(
    {},
  );
  const api = useTRPC();
  const queryClient = useQueryClient();
  const { data: listStats } = useQuery(api.lists.stats.queryOptions());

  // Check if there are any shared lists
  const hasSharedLists = useMemo(() => {
    return lists?.data.some((list) => list.userRole !== "owner") ?? false;
  }, [lists?.data]);

  // Check if any list has children to determine if we need chevron spacing
  const hasAnyListsWithChildren = useMemo(() => {
    const checkForChildren = (node: ZBookmarkListTreeNode): boolean => {
      if (node.children && node.children.length > 0) return true;
      return false;
    };
    return (
      Object.values(lists?.root ?? {}).some(checkForChildren) || hasSharedLists
    );
  }, [lists?.root, hasSharedLists]);

  useEffect(() => {
    setRefreshing(isPending);
  }, [isPending]);

  if (error) {
    return <FullPageError error={error.message} onRetry={() => refetch()} />;
  }

  if (!lists) {
    return <FullPageSpinner />;
  }

  const onRefresh = () => {
    queryClient.invalidateQueries(api.lists.list.pathFilter());
    queryClient.invalidateQueries(api.lists.stats.pathFilter());
  };

  const links: ListLink[] = [
    {
      id: "fav",
      logo: "⭐️",
      name: "Favourites",
      href: "/dashboard/favourites",
      level: 0,
      numChildren: 0,
      collapsed: false,
    },
    {
      id: "arch",
      logo: "🗄️",
      name: "Archive",
      href: "/dashboard/archive",
      level: 0,
      numChildren: 0,
      collapsed: false,
    },
  ];

  // Add shared lists section if there are any
  if (hasSharedLists) {
    // Count shared lists to determine if section has children
    const sharedListsCount = Object.values(lists.root).filter(
      (list) => list.item.userRole !== "owner",
    ).length;

    links.push({
      id: "shared-section",
      logo: "👥",
      name: "Shared Lists",
      href: "#",
      level: 0,
      numChildren: sharedListsCount,
      collapsed: !showChildrenOf["shared-section"],
      isSharedSection: true,
    });

    // Add shared lists as children if section is expanded
    if (showChildrenOf["shared-section"]) {
      Object.values(lists.root).forEach((list) => {
        if (list.item.userRole !== "owner") {
          traverseTree(
            list,
            links,
            showChildrenOf,
            listStats?.stats,
            "shared-section",
            1,
          );
        }
      });
    }
  }

  // Add owned lists only
  Object.values(lists.root).forEach((list) => {
    if (list.item.userRole === "owner") {
      traverseTree(list, links, showChildrenOf, listStats?.stats);
    }
  });

  return (
    <>
      <FlatList
        style={styles.fullHeight}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          gap: 6,
          paddingBottom: 20,
          marginHorizontal: 15,
          marginBottom: 15,
        }}
        renderItem={(l) => (
          <View
            style={[
              styles.itemRow,
              { backgroundColor: colors.card },
              {
                borderCurve: "continuous",
                ...condProps({
                  condition: l.item.level > 0,
                  props: { marginLeft: l.item.level * 20 },
                }),
              },
            ]}
          >
            {hasAnyListsWithChildren && (
              <View style={{ width: 32 }}>
                {l.item.numChildren > 0 && (
                  <Pressable
                    style={styles.chevronToggle}
                    onPress={() => {
                      setShowChildrenOf((prev) => ({
                        ...prev,
                        [l.item.id]: !prev[l.item.id],
                      }));
                    }}
                  >
                    <ChevronRight
                      color={colors.foreground}
                      style={{
                        transform: [
                          { rotate: l.item.collapsed ? "0deg" : "90deg" },
                        ],
                      }}
                    />
                  </Pressable>
                )}
              </View>
            )}

            {l.item.isSharedSection ? (
              <Pressable
                style={styles.sharedPressable}
                onPress={() => {
                  setShowChildrenOf((prev) => ({
                    ...prev,
                    [l.item.id]: !prev[l.item.id],
                  }));
                }}
              >
                <Text style={styles.itemLabel} numberOfLines={1}>
                  {l.item.logo} {l.item.name}
                </Text>
              </Pressable>
            ) : (
              <Link
                asChild
                key={l.item.id}
                href={l.item.href}
                style={styles.flex1}
              >
                <Pressable style={styles.linkPressable}>
                  <Text style={styles.itemLabel} numberOfLines={1}>
                    {l.item.logo} {l.item.name}
                  </Text>
                  <View style={styles.metaRow}>
                    {l.item.numBookmarks !== undefined && (
                      <Text
                        style={[
                          styles.bookmarkCount,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {l.item.numBookmarks}
                      </Text>
                    )}
                    <ChevronRight />
                  </View>
                </Pressable>
              </Link>
            )}
          </View>
        )}
        data={links}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
      <FAB>
        <Pressable
          style={styles.fabPressable}
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/dashboard/lists/new");
          }}
        >
          <Plus
            size={24}
            color={Platform.OS === "ios" ? PlatformColor("label") : "white"}
          />
        </Pressable>
      </FAB>
    </>
  );
}

const styles = StyleSheet.create({
  fullHeight: {
    height: "100%",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chevronToggle: {
    paddingRight: 8,
  },
  sharedPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  linkPressable: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemLabel: {
    marginRight: 8,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookmarkCount: {
    marginRight: 8,
    fontSize: 12,
  },
  flex1: {
    flex: 1,
  },
  fabPressable: {
    height: "100%",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
});
