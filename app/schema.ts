import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(), // If you need to reference auth.users(id) cross-schema, handle in migration SQL
  email: text("email"),
  leagueCredits: integer("league_credits").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  // 0 = false, 1 = true
  isDraftStarted: integer("is_draft_started").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const rosterSlots = pgTable("roster_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  position: text("position").notNull(),
  slotCount: integer("slot_count").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: uuid("owner_id").references(() => users.id),
  leagueId: uuid("league_id").references(() => leagues.id),
  budget: integer("budget").default(200),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const nflPlayers = pgTable("nfl_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  position: text("position").notNull(),
  team: text("team").notNull(),
});

export const rosters = pgTable("rosters", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").references(() => teams.id),
  playerId: uuid("player_id").references(() => nflPlayers.id),
  price: integer("price").notNull(),
  assignedSlot: text("assigned_slot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const draftNominations = pgTable("draft_nominations", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  nominatingTeamId: uuid("nominating_team_id").references(() => teams.id),
  playerId: uuid("player_id").references(() => nflPlayers.id),
  currentBid: integer("current_bid"),
  highestBidderTeamId: uuid("highest_bidder_team_id").references(
    () => teams.id
  ),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  teamId: uuid("team_id").references(() => teams.id),
  playerId: uuid("player_id").references(() => nflPlayers.id),
  amount: integer("amount"),
  type: text("type"), // 'bid' or 'win'
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const draftState = pgTable("draft_state", {
  leagueId: uuid("league_id")
    .primaryKey()
    .references(() => leagues.id),
  currentNominationId: uuid("current_nomination_id").references(
    () => draftNominations.id
  ),
  clockEndsAt: timestamp("clock_ends_at", { withTimezone: true }),
  phase: text("phase").default("nominating"), // or 'bidding'
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  stripePaymentId: text("stripe_payment_id"),
  creditsGranted: integer("credits_granted"),
  amount: integer("amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
