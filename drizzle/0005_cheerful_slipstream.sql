ALTER TABLE `links` ADD `owner_id` text DEFAULT 'root' NOT NULL;--> statement-breakpoint
CREATE INDEX `links_owner_id_created_at_slug_idx` ON `links` (`owner_id`,`created_at`,`slug`);