ALTER TABLE "periods" DROP CONSTRAINT IF EXISTS "periods_type_check";
--> statement-breakpoint
ALTER TABLE "periods"
ADD CONSTRAINT "periods_type_check" CHECK ("type" in ('year', 'quarter', 'month', 'custom'));
