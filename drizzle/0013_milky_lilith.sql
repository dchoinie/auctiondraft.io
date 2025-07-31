ALTER TABLE "drafted_players" DROP CONSTRAINT "drafted_players_team_id_teams_id_fk";
--> statement-breakpoint
ALTER TABLE "drafted_players" ADD COLUMN "team_type" text DEFAULT 'regular';