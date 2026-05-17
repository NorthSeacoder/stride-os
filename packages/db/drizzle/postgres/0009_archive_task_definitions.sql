ALTER TABLE "task_definitions" ADD COLUMN "archived_at" timestamp with time zone;
CREATE INDEX "idx_task_definitions_archived_at" ON "task_definitions" USING btree ("archived_at");
