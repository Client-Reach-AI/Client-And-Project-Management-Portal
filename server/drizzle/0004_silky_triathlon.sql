ALTER TABLE "client_intakes" ADD COLUMN "service_type" text;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "contact_role" text;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "business_details" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "service_responses" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "uploaded_files" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "client_intakes" ADD COLUMN "calendly_event_id" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_name" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_role" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "service_type" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "business_details" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "service_responses" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "uploaded_files" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "calendly_event_id" text;