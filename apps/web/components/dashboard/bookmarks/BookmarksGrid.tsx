import { useEffect, useMemo } from "react";
import NoBookmarksBanner from "@/components/dashboard/bookmarks/NoBookmarksBanner";
import { ActionButton } from "@/components/ui/action-button";
import useBulkActionsStore from "@/lib/bulkActions";
import { useTranslation } from "@/lib/i18n/client";
import { useInBookmarkGridStore } from "@/lib/store/useInBookmarkGridStore";
import {
  bookmarkLayoutSwitch,
  useBookmarkLayout,
  useGridColumns,
} from "@/lib/userLocalSettings/bookmarksLayout";
import tailwindConfig from "@/tailwind.config";
import { Slot } from "@radix-ui/react-slot";
import { Bookmark, Puzzle, Smartphone } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import { useInView } from "react-intersection-observer";
import Masonry from "react-masonry-css";
import resolveConfig from "tailwindcss/resolveConfig";

import type { ZBookmark } from "@karakeep/shared/types/bookmarks";
import { useBookmarkListContext } from "@karakeep/shared-react/hooks/bookmark-list-context";

import BookmarkCard from "./BookmarkCard";
import EditorCard from "./EditorCard";
import UnknownCard from "./UnknownCard";

function StyledBookmarkCard({ children }: { children: React.ReactNode }) {
  return (
    <Slot className="mb-4 border border-border bg-card duration-300 ease-in hover:shadow-lg hover:transition-all">
      {children}
    </Slot>
  );
}

function getBreakpointConfig(userColumns: number) {
  const fullConfig = resolveConfig(tailwindConfig);

  const breakpointColumnsObj: { [key: number]: number; default: number } = {
    default: userColumns,
  };

  // Responsive behavior: reduce columns on smaller screens
  const lgColumns = Math.max(1, Math.min(userColumns, userColumns - 1));
  const mdColumns = Math.max(1, Math.min(userColumns, 2));
  const smColumns = 1;

  breakpointColumnsObj[parseInt(fullConfig.theme.screens.lg)] = lgColumns;
  breakpointColumnsObj[parseInt(fullConfig.theme.screens.md)] = mdColumns;
  breakpointColumnsObj[parseInt(fullConfig.theme.screens.sm)] = smColumns;
  return breakpointColumnsObj;
}

export default function BookmarksGrid({
  bookmarks,
  hasNextPage = false,
  fetchNextPage = () => ({}),
  isFetchingNextPage = false,
  showEditorCard = false,
}: {
  bookmarks: ZBookmark[];
  showEditorCard?: boolean;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => void;
}) {
  const { t } = useTranslation();
  const layout = useBookmarkLayout();
  const gridColumns = useGridColumns();
  const bulkActionsStore = useBulkActionsStore();
  const inBookmarkGrid = useInBookmarkGridStore();
  const withinListContext = useBookmarkListContext();
  const breakpointConfig = useMemo(
    () => getBreakpointConfig(gridColumns),
    [gridColumns],
  );
  const { ref: loadMoreRef, inView: loadMoreButtonInView } = useInView();

  useEffect(() => {
    bulkActionsStore.setVisibleBookmarks(bookmarks);
    bulkActionsStore.setListContext(withinListContext);

    return () => {
      bulkActionsStore.setVisibleBookmarks([]);
      bulkActionsStore.setListContext(undefined);
    };
  }, [bookmarks, withinListContext?.id]);

  useEffect(() => {
    inBookmarkGrid.setInBookmarkGrid(true);
    return () => {
      inBookmarkGrid.setInBookmarkGrid(false);
    };
  }, []);

  useEffect(() => {
    if (loadMoreButtonInView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [loadMoreButtonInView]);

  if (bookmarks.length == 0 && !showEditorCard) {
    return <NoBookmarksBanner />;
  }

  if (bookmarks.length == 0 && showEditorCard) {
    return (
      <div className="flex w-full flex-col items-center gap-8 rounded-xl border border-border bg-card px-6 py-8 shadow-sm sm:py-12">
        {/* Welcome text */}
        <div className="text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {t("banners.welcome.title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("banners.welcome.description")}
          </p>
        </div>

        {/* Editor card — primary action */}
        <div className="w-full max-w-xl">
          <EditorCard className="border-2 border-border bg-card shadow-md" />
        </div>

        {/* App links */}
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <a
            href="https://karakeep.app/apps"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Puzzle className="size-4" />
            {t("banners.welcome.browser_extension")}
          </a>
          <span className="hidden text-border sm:inline">|</span>
          <a
            href="https://karakeep.app/apps"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Smartphone className="size-4" />
            {t("banners.welcome.mobile_app")}
          </a>
        </div>
      </div>
    );
  }

  const children = [
    showEditorCard && (
      <StyledBookmarkCard key={"editor"}>
        <EditorCard />
      </StyledBookmarkCard>
    ),
    ...bookmarks.map((b) => (
      <ErrorBoundary key={b.id} fallback={<UnknownCard bookmark={b} />}>
        <StyledBookmarkCard>
          <BookmarkCard bookmark={b} />
        </StyledBookmarkCard>
      </ErrorBoundary>
    )),
  ];
  return (
    <>
      {bookmarkLayoutSwitch(layout, {
        masonry: (
          <Masonry
            className="-ml-4 flex w-auto"
            columnClassName="pl-4"
            breakpointCols={breakpointConfig}
          >
            {children}
          </Masonry>
        ),
        grid: (
          <Masonry
            className="-ml-4 flex w-auto"
            columnClassName="pl-4"
            breakpointCols={breakpointConfig}
          >
            {children}
          </Masonry>
        ),
        list: <div className="grid grid-cols-1">{children}</div>,
        compact: <div className="grid grid-cols-1">{children}</div>,
      })}
      {hasNextPage && (
        <div className="flex justify-center">
          <ActionButton
            ref={loadMoreRef}
            ignoreDemoMode={true}
            loading={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            variant="ghost"
          >
            Load More
          </ActionButton>
        </div>
      )}
    </>
  );
}
