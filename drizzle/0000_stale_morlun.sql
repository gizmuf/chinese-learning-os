CREATE TABLE `learning_events` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`item_id` text NOT NULL,
	`at` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `events_user_at` ON `learning_events` (`user_id`,`at`);