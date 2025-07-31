CREATE TABLE "offline_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"league_id" uuid,
	"budget" integer DEFAULT 200,
	"draft_order" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "draft_mode" text DEFAULT 'live';--> statement-breakpoint
ALTER TABLE "offline_teams" ADD CONSTRAINT "offline_teams_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;