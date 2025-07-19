CREATE TABLE "draft_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nomination_id" uuid,
	"team_id" uuid,
	"amount" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "draft_state" ADD COLUMN "current_turn_team_id" uuid;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "draft_order" integer;--> statement-breakpoint
ALTER TABLE "draft_bids" ADD CONSTRAINT "draft_bids_nomination_id_draft_nominations_id_fk" FOREIGN KEY ("nomination_id") REFERENCES "public"."draft_nominations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_bids" ADD CONSTRAINT "draft_bids_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "draft_state" ADD CONSTRAINT "draft_state_current_turn_team_id_teams_id_fk" FOREIGN KEY ("current_turn_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;