ALTER TABLE `tasks` ADD `archived_at` integer;--> statement-breakpoint
CREATE INDEX `idx_tasks_archived_at` ON `tasks` (`archived_at`);--> statement-breakpoint
ALTER TABLE `reviews` ADD `archived_at` integer;--> statement-breakpoint
CREATE INDEX `idx_reviews_archived_at` ON `reviews` (`archived_at`);
