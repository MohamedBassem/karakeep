"use client";

import { useTranslation } from "@/lib/i18n/client";
import { Bookmark } from "lucide-react";

export default function NoBookmarksBanner() {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card px-6 py-16 text-center sm:py-20">
      {/* Subtle dot pattern texture */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(var(--muted-foreground) / 0.08) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Overlapping bookmark card illustration */}
      <div className="relative mb-10 h-36 w-56 sm:h-40 sm:w-64">
        {/* Back-left card — link-style skeleton */}
        <div
          className="absolute left-0 top-3 animate-float"
          style={{ animationDelay: "0s" }}
        >
          <div
            className="flex h-24 w-36 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm sm:h-28 sm:w-40"
            style={{ transform: "rotate(-8deg)" }}
          >
            <div className="h-2 w-3/4 rounded-full bg-black/[.06] dark:bg-white/[.08]" />
            <div className="h-1.5 w-full rounded-full bg-black/[.04] dark:bg-white/[.06]" />
            <div className="h-1.5 w-2/3 rounded-full bg-black/[.04] dark:bg-white/[.06]" />
            <div className="mt-auto flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-black/[.06] dark:bg-white/[.08]" />
              <div className="h-1.5 w-10 rounded-full bg-black/[.04] dark:bg-white/[.06]" />
            </div>
          </div>
        </div>

        {/* Back-right card — image-style skeleton */}
        <div
          className="absolute right-0 top-0 animate-float"
          style={{ animationDelay: "1.5s" }}
        >
          <div
            className="flex h-24 w-36 flex-col gap-1.5 rounded-lg border border-border bg-card p-3 shadow-sm sm:h-28 sm:w-40"
            style={{ transform: "rotate(6deg)" }}
          >
            <div className="flex-1 rounded bg-black/[.04] dark:bg-white/[.05]" />
            <div className="h-2 w-3/4 rounded-full bg-black/[.06] dark:bg-white/[.08]" />
            <div className="h-1.5 w-1/2 rounded-full bg-black/[.04] dark:bg-white/[.06]" />
          </div>
        </div>

        {/* Front card — text-style skeleton */}
        <div
          className="absolute left-1/2 top-4 -translate-x-1/2 animate-float"
          style={{ animationDelay: "0.7s" }}
        >
          <div
            className="flex h-24 w-36 flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-md sm:h-28 sm:w-40"
            style={{ transform: "rotate(-1deg)" }}
          >
            <div className="h-2 w-1/2 rounded-full bg-black/[.07] dark:bg-white/[.1]" />
            <div className="h-1.5 w-full rounded-full bg-black/[.05] dark:bg-white/[.07]" />
            <div className="h-1.5 w-full rounded-full bg-black/[.05] dark:bg-white/[.07]" />
            <div className="h-1.5 w-4/5 rounded-full bg-black/[.04] dark:bg-white/[.06]" />
          </div>
        </div>

        {/* Central bookmark badge */}
        <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary shadow-lg ring-4 ring-card">
            <Bookmark className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
          </div>
        </div>
      </div>

      <h3 className="relative mb-2 text-lg font-semibold tracking-tight text-foreground">
        {t("banners.no_bookmarks.title")}
      </h3>
      <p className="relative max-w-sm text-sm leading-relaxed text-muted-foreground">
        {t("banners.no_bookmarks.description")}
      </p>
    </div>
  );
}
