CREATE TABLE `link_tombstones` (
	`slug` text PRIMARY KEY NOT NULL,
	`deleted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `links` (
	`slug` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`url` text NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expiration` integer,
	`title` text,
	`description` text,
	`image` text,
	`apple` text,
	`google` text,
	`cloaking` integer,
	`redirect_with_query` integer,
	`password` text,
	`unsafe` integer,
	`geo` text,
	`normalized_url` text NOT NULL,
	`effective_expires_at` integer
);
--> statement-breakpoint
CREATE INDEX `links_created_at_slug_idx` ON `links` (`created_at`,`slug`);--> statement-breakpoint
CREATE INDEX `links_normalized_url_idx` ON `links` (`normalized_url`);--> statement-breakpoint
CREATE INDEX `links_id_idx` ON `links` (`id`);