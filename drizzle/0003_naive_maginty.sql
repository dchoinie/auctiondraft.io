CREATE TABLE "api_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now(),
	"player_count" integer,
	"status" text NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "nfl_players" RENAME COLUMN "name" TO "first_name";--> statement-breakpoint
ALTER TABLE "nfl_players" ALTER COLUMN "team" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "sleeper_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "fantasy_positions" text[];--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "status" text;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "injury_status" text;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "years_exp" integer;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "age" integer;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "search_rank" integer;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "depth_chart_position" integer;--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "created_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "nfl_players" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now();--> statement-breakpoint
ALTER TABLE "nfl_players" ADD CONSTRAINT "nfl_players_sleeper_id_unique" UNIQUE("sleeper_id");