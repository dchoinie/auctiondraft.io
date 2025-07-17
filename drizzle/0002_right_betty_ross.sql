ALTER TABLE "users" RENAME TO "user_profiles";--> statement-breakpoint
ALTER TABLE "leagues" DROP CONSTRAINT "leagues_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "teams" DROP CONSTRAINT "teams_owner_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_owner_id_user_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_user_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;