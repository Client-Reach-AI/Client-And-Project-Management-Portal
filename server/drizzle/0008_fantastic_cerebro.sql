CREATE TABLE "mnt_people" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "shared_files" ADD COLUMN "mnt_person_id" text;--> statement-breakpoint
ALTER TABLE "mnt_people" ADD CONSTRAINT "mnt_people_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shared_files" ADD CONSTRAINT "shared_files_mnt_person_id_mnt_people_id_fk" FOREIGN KEY ("mnt_person_id") REFERENCES "public"."mnt_people"("id") ON DELETE no action ON UPDATE no action;