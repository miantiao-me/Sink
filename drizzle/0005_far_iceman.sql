ALTER TABLE `links` ADD `owner_email` text;--> statement-breakpoint
CREATE INDEX `links_owner_email_idx` ON `links` (`owner_email`);