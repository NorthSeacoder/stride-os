PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`description` text,
	`status` text DEFAULT 'inbox' NOT NULL,
	`list_id` text,
	`due_date` text,
	`completed_at` integer,
	`definition_id` text,
	`occurrence_date` text,
	`important` integer DEFAULT false NOT NULL,
	`urgent` integer DEFAULT false NOT NULL,
	`priority` text,
	`energy` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`list_id`) REFERENCES `task_lists`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`definition_id`) REFERENCES `task_definitions`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "tasks_status_check" CHECK("__new_tasks"."status" in ('inbox', 'done')),
	CONSTRAINT "tasks_priority_check" CHECK("__new_tasks"."priority" is null or "__new_tasks"."priority" in ('P1', 'P2', 'P3')),
	CONSTRAINT "tasks_energy_check" CHECK("__new_tasks"."energy" is null or "__new_tasks"."energy" in ('low', 'medium', 'high')),
	CONSTRAINT "tasks_completed_state_check" CHECK(("__new_tasks"."status" = 'done' and "__new_tasks"."completed_at" is not null) or ("__new_tasks"."status" <> 'done' and "__new_tasks"."completed_at" is null))
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "title", "notes", "description", "status", "list_id", "due_date", "completed_at", "definition_id", "occurrence_date", "important", "urgent", "priority", "energy", "created_at", "updated_at") SELECT "id", "title", "notes", "description", "status", "list_id", "due_date", "completed_at", "definition_id", "occurrence_date", "important", "urgent", "priority", "energy", "created_at", "updated_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_tasks_status` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_list_id` ON `tasks` (`list_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_due_date` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_completed_at` ON `tasks` (`completed_at`);--> statement-breakpoint
CREATE INDEX `idx_tasks_definition_id` ON `tasks` (`definition_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_definition_occurrence` ON `tasks` (`definition_id`,`occurrence_date`);--> statement-breakpoint
CREATE INDEX `idx_tasks_priority` ON `tasks` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_tasks_importance_urgency` ON `tasks` (`important`,`urgent`);