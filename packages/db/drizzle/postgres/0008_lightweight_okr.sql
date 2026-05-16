ALTER TABLE "key_results" DROP CONSTRAINT IF EXISTS "key_results_type_check";--> statement-breakpoint
ALTER TABLE "key_results" DROP CONSTRAINT IF EXISTS "key_results_confidence_check";--> statement-breakpoint
ALTER TABLE "key_results" DROP COLUMN IF EXISTS "type";--> statement-breakpoint
ALTER TABLE "key_results" DROP COLUMN IF EXISTS "target_value";--> statement-breakpoint
ALTER TABLE "key_results" DROP COLUMN IF EXISTS "current_value";--> statement-breakpoint
ALTER TABLE "key_results" DROP COLUMN IF EXISTS "unit";--> statement-breakpoint
ALTER TABLE "key_results" DROP COLUMN IF EXISTS "confidence";--> statement-breakpoint
ALTER TABLE "key_results" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "kr_check_ins" DROP CONSTRAINT IF EXISTS "kr_check_ins_confidence_check";--> statement-breakpoint
ALTER TABLE "kr_check_ins" DROP COLUMN IF EXISTS "progress_value";--> statement-breakpoint
ALTER TABLE "kr_check_ins" DROP COLUMN IF EXISTS "confidence";
