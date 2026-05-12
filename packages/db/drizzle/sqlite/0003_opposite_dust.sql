CREATE TABLE `task_definition_kr_links` (
	`definition_id` text NOT NULL,
	`key_result_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`definition_id`, `key_result_id`),
	FOREIGN KEY (`definition_id`) REFERENCES `task_definitions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`key_result_id`) REFERENCES `key_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_task_definition_kr_links_key_result_id` ON `task_definition_kr_links` (`key_result_id`);--> statement-breakpoint
CREATE TABLE `task_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`list_id` text NOT NULL,
	`frequency` text NOT NULL,
	`end_type` text NOT NULL,
	`end_date` text,
	`occurrence_count` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `task_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "task_definitions_frequency_check" CHECK("task_definitions"."frequency" in ('daily', 'weekly', 'monthly', 'weekdays', 'weekends')),
	CONSTRAINT "task_definitions_end_type_check" CHECK("task_definitions"."end_type" in ('never', 'until_date', 'after_count'))
);
--> statement-breakpoint
CREATE INDEX `idx_task_definitions_list_id` ON `task_definitions` (`list_id`);--> statement-breakpoint
CREATE INDEX `idx_task_definitions_frequency` ON `task_definitions` (`frequency`);--> statement-breakpoint
CREATE TABLE `task_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`kind` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "task_lists_kind_check" CHECK("task_lists"."kind" in ('system', 'user'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_lists_slug_unique` ON `task_lists` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_task_lists_kind` ON `task_lists` (`kind`);--> statement-breakpoint
CREATE INDEX `idx_task_lists_sort_order` ON `task_lists` (`sort_order`);--> statement-breakpoint
INSERT OR IGNORE INTO `task_lists` (`id`, `name`, `icon`, `kind`, `slug`, `sort_order`, `created_at`, `updated_at`)
VALUES (lower(hex(randomblob(16))), '收集箱', 'inbox', 'system', 'inbox', 0, unixepoch() * 1000, unixepoch() * 1000);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "periods_type_check" CHECK("__new_periods"."type" in ('year', 'quarter', 'month', 'custom')),
	CONSTRAINT "periods_status_check" CHECK("__new_periods"."status" in ('active', 'archived')),
	CONSTRAINT "periods_date_range_check" CHECK("__new_periods"."end_date" >= "__new_periods"."start_date")
);
--> statement-breakpoint
INSERT INTO `__new_periods`("id", "name", "type", "start_date", "end_date", "status", "created_at", "updated_at") SELECT "id", "name", "type", "start_date", "end_date", "status", "created_at", "updated_at" FROM `periods`;--> statement-breakpoint
DROP TABLE `periods`;--> statement-breakpoint
ALTER TABLE `__new_periods` RENAME TO `periods`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_periods_status` ON `periods` (`status`);--> statement-breakpoint
CREATE INDEX `idx_periods_start_date` ON `periods` (`start_date`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `description` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `list_id` text REFERENCES task_lists(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `definition_id` text REFERENCES task_definitions(id);--> statement-breakpoint
ALTER TABLE `tasks` ADD `occurrence_date` text;--> statement-breakpoint
CREATE INDEX `idx_tasks_list_id` ON `tasks` (`list_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_completed_at` ON `tasks` (`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_tasks_definition_id` ON `tasks` (`definition_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_definition_occurrence` ON `tasks` (`definition_id`,`occurrence_date`);
