CREATE TABLE `__new_key_results` (
  `id` text PRIMARY KEY NOT NULL,
  `objective_id` text NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`objective_id`) REFERENCES `objectives`(`id`) ON UPDATE no action ON DELETE cascade,
  CONSTRAINT `key_results_status_check` CHECK(`status` in ('active', 'at_risk', 'done', 'archived'))
);--> statement-breakpoint
INSERT INTO `__new_key_results` (`id`, `objective_id`, `title`, `description`, `status`, `created_at`, `updated_at`)
SELECT `id`, `objective_id`, `title`, NULL, `status`, `created_at`, `updated_at` FROM `key_results`;--> statement-breakpoint
DROP TABLE `key_results`;--> statement-breakpoint
ALTER TABLE `__new_key_results` RENAME TO `key_results`;--> statement-breakpoint
CREATE INDEX `idx_key_results_objective_id` ON `key_results` (`objective_id`);--> statement-breakpoint
CREATE INDEX `idx_key_results_status` ON `key_results` (`status`);--> statement-breakpoint
CREATE TABLE `__new_kr_check_ins` (
  `id` text PRIMARY KEY NOT NULL,
  `key_result_id` text NOT NULL,
  `summary` text,
  `blockers` text,
  `next_actions` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`key_result_id`) REFERENCES `key_results`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_kr_check_ins` (`id`, `key_result_id`, `summary`, `blockers`, `next_actions`, `created_at`)
SELECT `id`, `key_result_id`, `summary`, `blockers`, `next_actions`, `created_at` FROM `kr_check_ins`;--> statement-breakpoint
DROP TABLE `kr_check_ins`;--> statement-breakpoint
ALTER TABLE `__new_kr_check_ins` RENAME TO `kr_check_ins`;--> statement-breakpoint
CREATE INDEX `idx_kr_check_ins_key_result_id` ON `kr_check_ins` (`key_result_id`);--> statement-breakpoint
CREATE INDEX `idx_kr_check_ins_created_at` ON `kr_check_ins` (`created_at`);
