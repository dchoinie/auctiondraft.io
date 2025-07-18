CREATE TABLE "keepers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid,
	"team_id" uuid,
	"player_id" uuid,
	"keeper_price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "league_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid,
	"email" text NOT NULL,
	"invited_by" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "league_size" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "draft_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "draft_time" text;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "draft_location" text;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "roster_size" integer DEFAULT 16;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "starting_budget" integer DEFAULT 200;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "qb_slots" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "rb_slots" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "wr_slots" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "te_slots" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "flex_slots" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "dst_slots" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "k_slots" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "bench_slots" integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE "keepers" ADD CONSTRAINT "keepers_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keepers" ADD CONSTRAINT "keepers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "keepers" ADD CONSTRAINT "keepers_player_id_nfl_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."nfl_players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_invitations" ADD CONSTRAINT "league_invitations_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_invitations" ADD CONSTRAINT "league_invitations_invited_by_user_profiles_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;