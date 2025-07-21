ALTER TABLE "leagues" ADD COLUMN "draft_type" text DEFAULT 'snake';--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "timer_enabled" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "timer_duration" integer DEFAULT 60;