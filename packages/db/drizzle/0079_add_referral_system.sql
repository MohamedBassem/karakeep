CREATE TABLE `referralRewards` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`referralId` text NOT NULL,
	`rewardType` text DEFAULT 'free_month' NOT NULL,
	`amountCents` integer,
	`stripeCreditId` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer NOT NULL,
	`appliedAt` integer,
	`errorMessage` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referralId`) REFERENCES `referrals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `referralRewards_userId_idx` ON `referralRewards` (`userId`);--> statement-breakpoint
CREATE INDEX `referralRewards_referralId_idx` ON `referralRewards` (`referralId`);--> statement-breakpoint
CREATE INDEX `referralRewards_status_idx` ON `referralRewards` (`status`);--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`referrerUserId` text NOT NULL,
	`referralCode` text NOT NULL,
	`referredUserId` text,
	`referredEmail` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`rewardApplied` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`usedAt` integer,
	`subscribedAt` integer,
	`rewardedAt` integer,
	FOREIGN KEY (`referrerUserId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`referredUserId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `referrals_referralCode_unique` ON `referrals` (`referralCode`);--> statement-breakpoint
CREATE INDEX `referrals_referrerUserId_idx` ON `referrals` (`referrerUserId`);--> statement-breakpoint
CREATE INDEX `referrals_referralCode_idx` ON `referrals` (`referralCode`);--> statement-breakpoint
CREATE INDEX `referrals_referredUserId_idx` ON `referrals` (`referredUserId`);--> statement-breakpoint
CREATE INDEX `referrals_status_idx` ON `referrals` (`status`);--> statement-breakpoint
ALTER TABLE `user` ADD `referralCode` text;--> statement-breakpoint
ALTER TABLE `user` ADD `referredBy` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_referralCode_unique` ON `user` (`referralCode`);