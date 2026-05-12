CREATE TABLE `key_results` (
	`id` text PRIMARY KEY NOT NULL,
	`objective_id` text NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`target_value` real,
	`current_value` real,
	`unit` text,
	`status` text DEFAULT 'active' NOT NULL,
	`confidence` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`objective_id`) REFERENCES `objectives`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "key_results_type_check" CHECK("key_results"."type" in ('numeric', 'milestone', 'hybrid')),
	CONSTRAINT "key_results_status_check" CHECK("key_results"."status" in ('active', 'at_risk', 'done', 'archived')),
	CONSTRAINT "key_results_confidence_check" CHECK("key_results"."confidence" is null or "key_results"."confidence" in ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE INDEX `idx_key_results_objective_id` ON `key_results` (`objective_id`);--> statement-breakpoint
CREATE INDEX `idx_key_results_status` ON `key_results` (`status`);--> statement-breakpoint
CREATE TABLE `kr_check_ins` (
	`id` text PRIMARY KEY NOT NULL,
	`key_result_id` text NOT NULL,
	`progress_value` real,
	`confidence` text NOT NULL,
	`summary` text,
	`blockers` text,
	`next_actions` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`key_result_id`) REFERENCES `key_results`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "kr_check_ins_confidence_check" CHECK("kr_check_ins"."confidence" in ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE INDEX `idx_kr_check_ins_key_result_id` ON `kr_check_ins` (`key_result_id`);--> statement-breakpoint
CREATE INDEX `idx_kr_check_ins_created_at` ON `kr_check_ins` (`created_at`);--> statement-breakpoint
CREATE TABLE `objectives` (
	`id` text PRIMARY KEY NOT NULL,
	`period_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`period_id`) REFERENCES `periods`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "objectives_status_check" CHECK("objectives"."status" in ('active', 'done', 'archived'))
);
--> statement-breakpoint
CREATE INDEX `idx_objectives_period_id` ON `objectives` (`period_id`);--> statement-breakpoint
CREATE INDEX `idx_objectives_status` ON `objectives` (`status`);--> statement-breakpoint
CREATE TABLE `periods` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "periods_type_check" CHECK("periods"."type" in ('year', 'quarter', 'custom')),
	CONSTRAINT "periods_status_check" CHECK("periods"."status" in ('active', 'archived')),
	CONSTRAINT "periods_date_range_check" CHECK("periods"."end_date" >= "periods"."start_date")
);
--> statement-breakpoint
CREATE INDEX `idx_periods_status` ON `periods` (`status`);--> statement-breakpoint
CREATE INDEX `idx_periods_start_date` ON `periods` (`start_date`);--> statement-breakpoint
CREATE TABLE `review_kr_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`key_result_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `reviews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`key_result_id`) REFERENCES `key_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_review_kr_snapshots_review_id` ON `review_kr_snapshots` (`review_id`);--> statement-breakpoint
CREATE INDEX `idx_review_kr_snapshots_key_result_id` ON `review_kr_snapshots` (`key_result_id`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`structured_summary` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "reviews_type_check" CHECK("reviews"."type" in ('weekly', 'monthly', 'period')),
	CONSTRAINT "reviews_status_check" CHECK("reviews"."status" in ('draft', 'final')),
	CONSTRAINT "reviews_period_range_check" CHECK("reviews"."period_end" >= "reviews"."period_start")
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_type` ON `reviews` (`type`);--> statement-breakpoint
CREATE INDEX `idx_reviews_period_start_end` ON `reviews` (`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_reviews_status` ON `reviews` (`status`);--> statement-breakpoint
CREATE TABLE `task_kr_links` (
	`task_id` text NOT NULL,
	`key_result_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`task_id`, `key_result_id`),
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`key_result_id`) REFERENCES `key_results`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_task_kr_links_key_result_id` ON `task_kr_links` (`key_result_id`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'inbox' NOT NULL,
	`today_type` text,
	`scheduled_date` text,
	`due_date` text,
	`completed_at` integer,
	`priority` text,
	`energy` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "tasks_status_check" CHECK("tasks"."status" in ('inbox', 'today', 'scheduled', 'done', 'canceled')),
	CONSTRAINT "tasks_today_type_value_check" CHECK("tasks"."today_type" is null or "tasks"."today_type" in ('must', 'focus')),
	CONSTRAINT "tasks_today_type_state_check" CHECK(("tasks"."status" = 'today' and "tasks"."today_type" is not null) or ("tasks"."status" <> 'today' and "tasks"."today_type" is null)),
	CONSTRAINT "tasks_priority_check" CHECK("tasks"."priority" is null or "tasks"."priority" in ('P1', 'P2', 'P3')),
	CONSTRAINT "tasks_energy_check" CHECK("tasks"."energy" is null or "tasks"."energy" in ('low', 'medium', 'high')),
	CONSTRAINT "tasks_completed_state_check" CHECK(("tasks"."status" = 'done' and "tasks"."completed_at" is not null) or ("tasks"."status" <> 'done' and "tasks"."completed_at" is null))
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_today_type` ON `tasks` (`today_type`);--> statement-breakpoint
CREATE INDEX `idx_tasks_scheduled_date` ON `tasks` (`scheduled_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_due_date` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_priority` ON `tasks` (`priority`);--> statement-breakpoint
