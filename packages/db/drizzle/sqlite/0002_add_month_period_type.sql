PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE "periods_new" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "start_date" text NOT NULL,
  "end_date" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  CONSTRAINT "periods_type_check" CHECK("type" in ('year', 'quarter', 'month', 'custom')),
  CONSTRAINT "periods_status_check" CHECK("status" in ('active', 'archived')),
  CONSTRAINT "periods_date_range_check" CHECK("end_date" >= "start_date")
);
--> statement-breakpoint
INSERT INTO "periods_new" ("id", "name", "type", "start_date", "end_date", "status", "created_at", "updated_at")
SELECT "id", "name", "type", "start_date", "end_date", "status", "created_at", "updated_at"
FROM "periods";
--> statement-breakpoint
DROP TABLE "periods";
--> statement-breakpoint
ALTER TABLE "periods_new" RENAME TO "periods";
--> statement-breakpoint
CREATE INDEX "idx_periods_status" ON "periods" ("status");
--> statement-breakpoint
CREATE INDEX "idx_periods_start_date" ON "periods" ("start_date");
--> statement-breakpoint
PRAGMA foreign_keys = ON;
