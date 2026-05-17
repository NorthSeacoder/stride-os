ALTER TABLE `task_definitions` ADD COLUMN `archived_at` integer;
CREATE INDEX `idx_task_definitions_archived_at` ON `task_definitions` (`archived_at`);
