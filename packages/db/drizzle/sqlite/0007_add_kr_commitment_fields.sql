ALTER TABLE `task_kr_links` ADD `counts_toward_commitment` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `task_kr_links` ADD `committed_at` integer;--> statement-breakpoint
CREATE INDEX `idx_task_kr_links_commitment` ON `task_kr_links` (`key_result_id`,`counts_toward_commitment`);--> statement-breakpoint
ALTER TABLE `task_definition_kr_links` ADD `counts_toward_commitment` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `task_definition_kr_links` ADD `committed_at` integer;--> statement-breakpoint
CREATE INDEX `idx_task_definition_kr_links_commitment` ON `task_definition_kr_links` (`key_result_id`,`counts_toward_commitment`);
