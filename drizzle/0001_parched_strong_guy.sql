CREATE TABLE `link_migration_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`expected_cursor` text,
	`scanned` integer DEFAULT 0 NOT NULL,
	`inserted` integer DEFAULT 0 NOT NULL,
	`skipped` integer DEFAULT 0 NOT NULL,
	`expired` integer DEFAULT 0 NOT NULL,
	`force` integer NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
