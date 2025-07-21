ALTER TABLE "leagues" ADD COLUMN "join_code" text;
-- No NOT NULL constraint, so this field can be null