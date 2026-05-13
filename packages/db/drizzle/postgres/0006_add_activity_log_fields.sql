ALTER TABLE "audit_logs" ADD COLUMN "target_title" varchar(255);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "source" varchar(50);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "summary" text;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_target_created_at" ON "audit_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor_created_at" ON "audit_logs" USING btree ("actor_type","actor_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action_created_at" ON "audit_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_source_created_at" ON "audit_logs" USING btree ("source","created_at");
