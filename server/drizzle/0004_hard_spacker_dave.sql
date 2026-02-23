CREATE TABLE "lead_intakes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"intake_id" text NOT NULL,
	"status" text DEFAULT 'SUBMITTED' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"business_model" text,
	"source_key" text,
	"biggest_bottleneck" text,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lead_intakes" ADD CONSTRAINT "lead_intakes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_intakes" ADD CONSTRAINT "lead_intakes_intake_id_client_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."client_intakes"("id") ON DELETE no action ON UPDATE no action;