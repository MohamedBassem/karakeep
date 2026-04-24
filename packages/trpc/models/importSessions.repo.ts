import { and, count, eq, gt, inArray, isNull, lt } from "drizzle-orm";
import { z } from "zod";

import type { DB } from "@karakeep/db";
import { importSessions, importStagingBookmarks } from "@karakeep/db/schema";
import {
  zCreateImportSessionRequestSchema,
  ZImportSession,
} from "@karakeep/shared/types/importSessions";

type ImportSessionRow = typeof importSessions.$inferSelect;
type StagingBookmarkRow = typeof importStagingBookmarks.$inferSelect;

export class ImportSessionsRepo {
  constructor(private db: DB) {}

  async get(id: string): Promise<ImportSessionRow | null> {
    const session = await this.db.query.importSessions.findFirst({
      where: eq(importSessions.id, id),
    });
    return session ?? null;
  }

  async create(
    userId: string,
    input: z.infer<typeof zCreateImportSessionRequestSchema>,
  ): Promise<ImportSessionRow> {
    const [session] = await this.db
      .insert(importSessions)
      .values({
        name: input.name,
        userId,
        rootListId: input.rootListId,
      })
      .returning();

    return session;
  }

  async getAll(userId: string): Promise<ImportSessionRow[]> {
    return await this.db.query.importSessions.findMany({
      where: eq(importSessions.userId, userId),
      orderBy: (importSessions, { desc }) => [desc(importSessions.createdAt)],
      limit: 50,
    });
  }

  async getStatusCounts(
    sessionId: string,
  ): Promise<{ status: string; count: number }[]> {
    return await this.db
      .select({
        status: importStagingBookmarks.status,
        count: count(),
      })
      .from(importStagingBookmarks)
      .where(eq(importStagingBookmarks.importSessionId, sessionId))
      .groupBy(importStagingBookmarks.status);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(importSessions)
      .where(eq(importSessions.id, id));
    return result.changes > 0;
  }

  async insertStagingBookmarks(
    bookmarks: {
      importSessionId: string;
      type: "link" | "text" | "asset";
      url?: string;
      title?: string;
      content?: string;
      note?: string;
      tags: string[];
      listIds: string[];
      sourceAddedAt?: Date;
      archived?: boolean;
      status: "pending";
    }[],
  ): Promise<void> {
    await this.db.insert(importStagingBookmarks).values(bookmarks);
  }

  async updateStatus(
    id: string,
    status: ZImportSession["status"],
  ): Promise<void> {
    await this.db
      .update(importSessions)
      .set({ status })
      .where(eq(importSessions.id, id));
  }

  async getActiveSessionIds(): Promise<string[]> {
    const sessions = await this.db
      .select({ id: importSessions.id })
      .from(importSessions)
      .where(inArray(importSessions.status, ["pending", "running"]));
    return sessions.map((s) => s.id);
  }

  async countActiveByStatus(): Promise<{ status: string; count: number }[]> {
    return await this.db
      .select({
        status: importSessions.status,
        count: count(),
      })
      .from(importSessions)
      .where(
        inArray(importSessions.status, [
          "staging",
          "pending",
          "running",
          "paused",
        ]),
      )
      .groupBy(importSessions.status);
  }

  async markSessionsRunningIfPending(sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0) return;
    await this.db
      .update(importSessions)
      .set({ status: "running" })
      .where(
        and(
          inArray(importSessions.id, sessionIds),
          eq(importSessions.status, "pending"),
        ),
      );
  }

  async updateSessionLastProcessedAt(sessionId: string): Promise<void> {
    await this.db
      .update(importSessions)
      .set({ lastProcessedAt: new Date() })
      .where(eq(importSessions.id, sessionId));
  }

  async countActiveStagingForSession(sessionId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(importStagingBookmarks)
      .where(
        and(
          eq(importStagingBookmarks.importSessionId, sessionId),
          inArray(importStagingBookmarks.status, ["pending", "processing"]),
        ),
      );
    return result?.count ?? 0;
  }

  async claimPendingStagingByIds(
    candidateIds: string[],
  ): Promise<StagingBookmarkRow[]> {
    if (candidateIds.length === 0) return [];
    return await this.db
      .update(importStagingBookmarks)
      .set({ status: "processing", processingStartedAt: new Date() })
      .where(
        and(
          eq(importStagingBookmarks.status, "pending"),
          inArray(importStagingBookmarks.id, candidateIds),
        ),
      )
      .returning();
  }

  async resetStagingItemToPending(id: string): Promise<void> {
    await this.db
      .update(importStagingBookmarks)
      .set({ status: "pending" })
      .where(eq(importStagingBookmarks.id, id));
  }

  async markStagingFailed(id: string, reason: string): Promise<void> {
    await this.db
      .update(importStagingBookmarks)
      .set({
        status: "failed",
        result: "rejected",
        resultReason: reason,
        completedAt: new Date(),
      })
      .where(eq(importStagingBookmarks.id, id));
  }

  async markStagingDuplicate(id: string, bookmarkId: string): Promise<void> {
    await this.db
      .update(importStagingBookmarks)
      .set({
        status: "completed",
        result: "skipped_duplicate",
        resultReason: "URL already exists",
        resultBookmarkId: bookmarkId,
        completedAt: new Date(),
      })
      .where(eq(importStagingBookmarks.id, id));
  }

  async markStagingAccepted(id: string, bookmarkId: string): Promise<void> {
    await this.db
      .update(importStagingBookmarks)
      .set({
        result: "accepted",
        resultBookmarkId: bookmarkId,
      })
      .where(eq(importStagingBookmarks.id, id));
  }

  async markStagingCompleted(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(importStagingBookmarks)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(inArray(importStagingBookmarks.id, ids));
  }

  async countInFlightProcessing(staleAfter: Date): Promise<number> {
    const [result] = await this.db
      .select({ count: count() })
      .from(importStagingBookmarks)
      .where(
        and(
          eq(importStagingBookmarks.status, "processing"),
          gt(importStagingBookmarks.processingStartedAt, staleAfter),
        ),
      );
    return result?.count ?? 0;
  }

  async getStaleProcessingIds(staleBefore: Date): Promise<string[]> {
    const rows = await this.db
      .select({ id: importStagingBookmarks.id })
      .from(importStagingBookmarks)
      .where(
        and(
          eq(importStagingBookmarks.status, "processing"),
          lt(importStagingBookmarks.processingStartedAt, staleBefore),
          isNull(importStagingBookmarks.resultBookmarkId),
        ),
      );
    return rows.map((r) => r.id);
  }

  async resetStagingItemsToPending(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.db
      .update(importStagingBookmarks)
      .set({ status: "pending", processingStartedAt: null })
      .where(inArray(importStagingBookmarks.id, ids));
  }

  async getStagingBookmarks(
    sessionId: string,
    filter?: "all" | "accepted" | "rejected" | "skipped_duplicate" | "pending",
    cursor?: string,
    limit = 50,
  ): Promise<{ items: StagingBookmarkRow[]; nextCursor: string | null }> {
    const results = await this.db
      .select()
      .from(importStagingBookmarks)
      .where(
        and(
          eq(importStagingBookmarks.importSessionId, sessionId),
          filter && filter !== "all"
            ? filter === "pending"
              ? eq(importStagingBookmarks.status, "pending")
              : eq(importStagingBookmarks.result, filter)
            : undefined,
          cursor ? gt(importStagingBookmarks.id, cursor) : undefined,
        ),
      )
      .orderBy(importStagingBookmarks.id)
      .limit(limit + 1);

    const hasMore = results.length > limit;
    return {
      items: results.slice(0, limit),
      nextCursor: hasMore ? results[limit - 1].id : null,
    };
  }
}
