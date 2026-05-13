ALTER TABLE `audit_logs` ADD `target_title` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `source` text;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD `summary` text;--> statement-breakpoint
CREATE INDEX `idx_audit_logs_created_at` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_target_created_at` ON `audit_logs` (`target_type`,`target_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_actor_created_at` ON `audit_logs` (`actor_type`,`actor_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_action_created_at` ON `audit_logs` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_logs_source_created_at` ON `audit_logs` (`source`,`created_at`);
