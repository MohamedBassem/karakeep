ALTER TABLE `bookmarks` ADD `pinnedAt` integer;--> statement-breakpoint
CREATE INDEX `bookmarks_userId_pinnedAt_createdAt_id_idx` ON `bookmarks` (`userId`,`pinnedAt`,`createdAt`,`id`);--> statement-breakpoint
ALTER TABLE `bookmarksInLists` ADD `pinnedAt` integer;--> statement-breakpoint
CREATE INDEX `bookmarksInLists_listId_pinnedAt_idx` ON `bookmarksInLists` (`listId`,`pinnedAt`);--> statement-breakpoint
ALTER TABLE `tagsOnBookmarks` ADD `pinnedAt` integer;--> statement-breakpoint
CREATE INDEX `tagsOnBookmarks_tagId_pinnedAt_idx` ON `tagsOnBookmarks` (`tagId`,`pinnedAt`);