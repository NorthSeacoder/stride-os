ALTER TABLE "task_kr_links" ADD COLUMN "counts_toward_commitment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_kr_links" ADD COLUMN "committed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_task_kr_links_commitment" ON "task_kr_links" USING btree ("key_result_id","counts_toward_commitment");--> statement-breakpoint
ALTER TABLE "task_definition_kr_links" ADD COLUMN "counts_toward_commitment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_definition_kr_links" ADD COLUMN "committed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_task_definition_kr_links_commitment" ON "task_definition_kr_links" USING btree ("key_result_id","counts_toward_commitment");
