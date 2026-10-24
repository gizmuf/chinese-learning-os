CREATE TABLE `recognition_events` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`at` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `recognition_events_user_at` ON `recognition_events` (`user_id`,`at`);