ALTER TABLE "lead_intakes" ADD COLUMN "client_id" text;
ALTER TABLE "lead_intakes" ADD COLUMN "project_id" text;

ALTER TABLE "lead_intakes"
  ADD CONSTRAINT "lead_intakes_client_id_clients_id_fk"
  FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "lead_intakes"
  ADD CONSTRAINT "lead_intakes_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE no action ON UPDATE no action;
