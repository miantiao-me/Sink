CREATE TABLE `link_tags` (
	`link_slug` text NOT NULL,
	`tag_name` text NOT NULL,
	PRIMARY KEY(`link_slug`, `tag_name`),
	FOREIGN KEY (`link_slug`) REFERENCES `links`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_name`) REFERENCES `tags`(`name`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `link_tags_tag_name_link_slug_idx` ON `link_tags` (`tag_name`,`link_slug`);--> statement-breakpoint
CREATE TABLE `tags` (
	`name` text PRIMARY KEY NOT NULL
);
