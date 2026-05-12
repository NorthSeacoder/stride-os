CREATE TABLE "task_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"icon" varchar(64),
	"kind" varchar(16) NOT NULL,
	"slug" varchar(64) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_lists_kind_check" CHECK ("task_lists"."kind" in ('system', 'user'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_lists_slug_unique" ON "task_lists" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_task_lists_kind" ON "task_lists" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_task_lists_sort_order" ON "task_lists" USING btree ("sort_order");--> statement-breakpoint
INSERT INTO "task_lists" ("name", "icon", "kind", "slug", "sort_order")
VALUES ('收集箱', 'inbox', 'system', 'inbox', 0)
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
CREATE TABLE "task_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"list_id" uuid NOT NULL,
	"frequency" varchar(16) NOT NULL,
	"end_type" varchar(16) NOT NULL,
	"end_date" date,
	"occurrence_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_definitions_frequency_check" CHECK ("task_definitions"."frequency" in ('daily', 'weekly', 'monthly', 'weekdays', 'weekends')),
	CONSTRAINT "task_definitions_end_type_check" CHECK ("task_definitions"."end_type" in ('never', 'until_date', 'after_count'))
);
--> statement-breakpoint
ALTER TABLE "task_definitions" ADD CONSTRAINT "task_definitions_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "task_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_definitions_list_id" ON "task_definitions" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "idx_task_definitions_frequency" ON "task_definitions" USING btree ("frequency");--> statement-breakpoint
CREATE TABLE "task_definition_kr_links" (
	"definition_id" uuid NOT NULL,
	"key_result_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_definition_kr_links_definition_id_key_result_id_pk" PRIMARY KEY("definition_id","key_result_id")
);
--> statement-breakpoint
ALTER TABLE "task_definition_kr_links" ADD CONSTRAINT "task_definition_kr_links_definition_id_task_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "task_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_definition_kr_links" ADD CONSTRAINT "task_definition_kr_links_key_result_id_key_results_id_fk" FOREIGN KEY ("key_result_id") REFERENCES "key_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_task_definition_kr_links_key_result_id" ON "task_definition_kr_links" USING btree ("key_result_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "list_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "definition_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "occurrence_date" date;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_list_id_task_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "task_lists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_definition_id_task_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "task_definitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tasks_list_id" ON "tasks" USING btree ("list_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_completed_at" ON "tasks" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_tasks_definition_id" ON "tasks" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "idx_tasks_definition_occurrence" ON "tasks" USING btree ("definition_id","occurrence_date");
