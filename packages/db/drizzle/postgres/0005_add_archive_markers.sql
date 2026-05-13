ALTER TABLE "tasks" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_tasks_archived_at" ON "tasks" USING btree ("archived_at");--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_reviews_archived_at" ON "reviews" USING btree ("archived_at");
