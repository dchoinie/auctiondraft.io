CREATE TABLE "drafted_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid,
	"player_id" uuid,
	"league_id" uuid,
	"draft_price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "draft_bids" CASCADE;--> statement-breakpoint
DROP TABLE "draft_nominations" CASCADE;--> statement-breakpoint
DROP TABLE "draft_state" CASCADE;--> statement-breakpoint
DROP TABLE "roster_slots" CASCADE;--> statement-breakpoint
DROP TABLE "rosters" CASCADE;--> statement-breakpoint
DROP TABLE "transactions" CASCADE;--> statement-breakpoint
ALTER TABLE "drafted_players" ADD CONSTRAINT "drafted_players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafted_players" ADD CONSTRAINT "drafted_players_player_id_nfl_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."nfl_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drafted_players" ADD CONSTRAINT "drafted_players_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;