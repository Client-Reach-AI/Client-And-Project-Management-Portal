ALTER TABLE "lead_intakes" ADD COLUMN "lead_status" text DEFAULT 'NEW' NOT NULL;
UPDATE "lead_intakes" SET "lead_status" = 'NEW' WHERE "lead_status" IS NULL;
