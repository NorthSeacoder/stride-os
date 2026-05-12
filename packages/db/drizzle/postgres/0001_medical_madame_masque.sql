CREATE TABLE "key_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"objective_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(32) NOT NULL,
	"target_value" double precision,
	"current_value" double precision,
	"unit" varchar(64),
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"confidence" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "key_results_type_check" CHECK ("key_results"."type" in ('numeric', 'milestone', 'hybrid')),
	CONSTRAINT "key_results_status_check" CHECK ("key_results"."status" in ('active', 'at_risk', 'done', 'archived')),
	CONSTRAINT "key_results_confidence_check" CHECK ("key_results"."confidence" is null or "key_results"."confidence" in ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE TABLE "kr_check_ins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_result_id" uuid NOT NULL,
	"progress_value" double precision,
	"confidence" varchar(16) NOT NULL,
	"summary" text,
	"blockers" text,
	"next_actions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kr_check_ins_confidence_check" CHECK ("kr_check_ins"."confidence" in ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE TABLE "objectives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "objectives_status_check" CHECK ("objectives"."status" in ('active', 'done', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(32) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "periods_type_check" CHECK ("periods"."type" in ('year', 'quarter', 'custom')),
	CONSTRAINT "periods_status_check" CHECK ("periods"."status" in ('active', 'archived')),
	CONSTRAINT "periods_date_range_check" CHECK ("periods"."end_date" >= "periods"."start_date")
);
--> statement-breakpoint
CREATE TABLE "review_kr_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid NOT NULL,
	"key_result_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(32) NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"structured_summary" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_type_check" CHECK ("reviews"."type" in ('weekly', 'monthly', 'period')),
	CONSTRAINT "reviews_status_check" CHECK ("reviews"."status" in ('draft', 'final')),
	CONSTRAINT "reviews_period_range_check" CHECK ("reviews"."period_end" >= "reviews"."period_start")
);
--> statement-breakpoint
CREATE TABLE "task_kr_links" (
	"task_id" uuid NOT NULL,
	"key_result_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_kr_links_task_id_key_result_id_pk" PRIMARY KEY("task_id","key_result_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"notes" text,
	"status" varchar(32) DEFAULT 'inbox' NOT NULL,
	"today_type" varchar(16),
	"scheduled_date" date,
	"due_date" date,
	"completed_at" timestamp with time zone,
	"important" boolean DEFAULT false NOT NULL,
	"urgent" boolean DEFAULT false NOT NULL,
	"priority" varchar(8),
	"energy" varchar(16),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" in ('inbox', 'today', 'scheduled', 'done', 'canceled')),
	CONSTRAINT "tasks_today_type_value_check" CHECK ("tasks"."today_type" is null or "tasks"."today_type" in ('must', 'focus')),
	CONSTRAINT "tasks_today_type_state_check" CHECK (("tasks"."status" = 'today' and "tasks"."today_type" is not null) or ("tasks"."status" <> 'today' and "tasks"."today_type" is null)),
	CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" is null or "tasks"."priority" in ('P1', 'P2', 'P3')),
	CONSTRAINT "tasks_energy_check" CHECK ("tasks"."energy" is null or "tasks"."energy" in ('low', 'medium', 'high')),
	CONSTRAINT "tasks_completed_state_check" CHECK (("tasks"."status" = 'done' and "tasks"."completed_at" is not null) or ("tasks"."status" <> 'done' and "tasks"."completed_at" is null))
);
--> statement-breakpoint
ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objective_id_objectives_id_fk" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kr_check_ins" ADD CONSTRAINT "kr_check_ins_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_period_id_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "periods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_kr_snapshots" ADD CONSTRAINT "review_kr_snapshots_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_kr_snapshots" ADD CONSTRAINT "review_kr_snapshots_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_kr_links" ADD CONSTRAINT "task_kr_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_kr_links" ADD CONSTRAINT "task_kr_links_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_key_results_objective_id" ON "key_results" USING btree ("objective_id");--> statement-breakpoint
CREATE INDEX "idx_key_results_status" ON "key_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_kr_check_ins_key_result_id" ON "kr_check_ins" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_kr_check_ins_created_at" ON "kr_check_ins" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_objectives_period_id" ON "objectives" USING btree ("period_id");--> statement-breakpoint
CREATE INDEX "idx_objectives_status" ON "objectives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_periods_status" ON "periods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_periods_start_date" ON "periods" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_review_kr_snapshots_review_id" ON "review_kr_snapshots" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_review_kr_snapshots_key_result_id" ON "review_kr_snapshots" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_type" ON "reviews" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_reviews_period_start_end" ON "reviews" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "idx_reviews_status" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_kr_links_key_result_id" ON "task_kr_links" USING btree ("key_result_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_status" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tasks_today_type" ON "tasks" USING btree ("today_type");--> statement-breakpoint
CREATE INDEX "idx_tasks_scheduled_date" ON "tasks" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_due_date" ON "tasks" USING btree ("due_date");--> statement-breakpoint
CREATE INDEX "idx_tasks_priority" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_tasks_importance_urgency" ON "tasks" USING btree ("important","urgent");
