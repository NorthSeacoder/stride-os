DROP INDEX IF EXISTS "idx_tasks_today_type";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_tasks_scheduled_date";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_today_type_value_check";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_today_type_state_check";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_status_check";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "today_type";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "scheduled_date";--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('inbox', 'done'));
