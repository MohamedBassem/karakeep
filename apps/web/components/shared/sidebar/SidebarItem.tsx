"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SidebarItem({
  name,
  logo,
  path,
  className,
  linkClassName,
  style,
  collapseButton,
  right = null,
  dropHighlight = false,
  insertIndicator = null,
  draggable = false,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDragStart,
  onDragEnd,
}: {
  name: string;
  logo: React.ReactNode;
  path: string;
  style?: React.CSSProperties;
  className?: string;
  linkClassName?: string;
  right?: React.ReactNode;
  collapseButton?: React.ReactNode;
  dropHighlight?: boolean;
  insertIndicator?: "above" | "below" | null;
  draggable?: boolean;
  onDrop?: React.DragEventHandler;
  onDragOver?: React.DragEventHandler;
  onDragEnter?: React.DragEventHandler;
  onDragLeave?: React.DragEventHandler;
  onDragStart?: React.DragEventHandler;
  onDragEnd?: React.DragEventHandler;
}) {
  const currentPath = usePathname();
  return (
    <li
      className={cn(
        "relative flex justify-between rounded-lg text-sm transition-colors hover:bg-accent",
        path == currentPath
          ? "bg-accent/50 text-foreground"
          : "text-muted-foreground",
        dropHighlight && "bg-accent ring-2 ring-primary",
        className,
      )}
      style={style}
      draggable={draggable}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {insertIndicator === "above" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-px h-0.5 rounded-full bg-primary"
        />
      )}
      {insertIndicator === "below" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
        />
      )}
      <div className="flex-1">
        {collapseButton}
        <Link
          href={path}
          className={cn(
            "flex items-center gap-x-2 rounded-[inherit] px-3 py-2",
            linkClassName,
          )}
        >
          {logo}
          <span title={name} className="line-clamp-1 break-all">
            {name}
          </span>
        </Link>
      </div>
      {right}
    </li>
  );
}
