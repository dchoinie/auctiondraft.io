-- Fix keepers table to allow references to both teams and offline_teams
-- Drop the existing foreign key constraint
ALTER TABLE "keepers" DROP CONSTRAINT IF EXISTS "keepers_team_id_teams_id_fk";

-- Add a check constraint to ensure team_id exists in either teams or offline_teams
ALTER TABLE "keepers" ADD CONSTRAINT "keepers_team_id_check" 
CHECK (
  EXISTS (SELECT 1 FROM "teams" WHERE "teams"."id" = "keepers"."team_id") OR
  EXISTS (SELECT 1 FROM "offline_teams" WHERE "offline_teams"."id" = "keepers"."team_id")
); 