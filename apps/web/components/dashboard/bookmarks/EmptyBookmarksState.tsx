"use client";

import { useTranslation } from "@/lib/i18n/client";
import { Bookmark, FileText, Globe, Image } from "lucide-react";

export default function EmptyBookmarksState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20">
          <Bookmark className="h-10 w-10 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 shadow-sm dark:bg-green-900/40">
          <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div className="absolute -bottom-2 -left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 shadow-sm dark:bg-amber-900/40">
          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="absolute -bottom-1 -right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 shadow-sm dark:bg-rose-900/40">
          <Image className="h-4 w-4 text-rose-600 dark:text-rose-400" />
        </div>
      </div>
      <h3 className="mb-2 text-xl font-semibold text-foreground">
        {t("banners.empty_state.title")}
      </h3>
      <p className="mb-8 max-w-sm text-sm text-muted-foreground">
        {t("banners.empty_state.description")}
      </p>
      <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
            <Globe className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t("banners.empty_state.hint_links")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t("banners.empty_state.hint_notes")}
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
            <Image className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {t("banners.empty_state.hint_images")}
          </span>
        </div>
      </div>
    </div>
  );
}
