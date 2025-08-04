import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(), // This should be the Clerk user ID
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  leagueCredits: integer("league_credits").default(0),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const leagues = pgTable("leagues", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: text("owner_id").references(() => userProfiles.id),
  // 0 = false, 1 = true
  isDraftStarted: integer("is_draft_started").default(0),
  // League Settings
  leagueSize: integer("league_size").default(10),
  draftDate: timestamp("draft_date", { withTimezone: true }),
  draftTime: text("draft_time"), // stored as HH:MM format
  draftLocation: text("draft_location"),
  startingBudget: integer("starting_budget").default(200),
  // Roster position settings (default fantasy football lineup)
  qbSlots: integer("qb_slots").default(1),
  rbSlots: integer("rb_slots").default(2),
  wrSlots: integer("wr_slots").default(2),
  teSlots: integer("te_slots").default(1),
  flexSlots: integer("flex_slots").default(1),
  dstSlots: integer("dst_slots").default(1),
  kSlots: integer("k_slots").default(1),
  benchSlots: integer("bench_slots").default(7),
  // Draft Management Settings
  draftType: text("draft_type").default("snake"), // "linear" or "snake"
  draftMode: text("draft_mode").default("live"), // "live" or "offline"
  timerEnabled: integer("timer_enabled").default(0), // 0 = false, 1 = true
  timerDuration: integer("timer_duration").default(60), // seconds
  status: text("status").default("active"), // "active" or "deleted"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  joinCode: text("join_code"),
});

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  ownerId: text("owner_id").references(() => userProfiles.id),
  leagueId: uuid("league_id").references(() => leagues.id),
  budget: integer("budget").default(200),
  draftOrder: integer("draft_order"), // Order in which teams pick during draft
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const offlineTeams = pgTable("offline_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  leagueId: uuid("league_id").references(() => leagues.id),
  budget: integer("budget").default(200),
  draftOrder: integer("draft_order"), // Order in which teams pick during draft
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const nflPlayers = pgTable("nfl_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  sleeperId: text("sleeper_id").unique().notNull(), // "3086" from API
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  position: text("position").notNull(), // "QB"
  team: text("team"), // "NE" (can be null for free agents)
  fantasyPositions: text("fantasy_positions").array(), // ["QB"]
  status: text("status"), // "Active", "Inactive", etc.
  injuryStatus: text("injury_status"), // null or injury details
  yearsExp: integer("years_exp"),
  age: integer("age"),
  searchRank: integer("search_rank"), // For ordering/popularity
  depthChartPosition: integer("depth_chart_position"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const draftedPlayers = pgTable(
  "drafted_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id"), // Can reference either teams.id or offlineTeams.id
    playerId: uuid("player_id").references(() => nflPlayers.id),
    leagueId: uuid("league_id").references(() => leagues.id),
    draftPrice: integer("draft_price").notNull(),
    teamType: text("team_type").default("regular"), // "regular" or "offline"
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Ensure a player can only be drafted once per league
    uniquePlayerPerLeague: unique().on(table.playerId, table.leagueId),
  })
);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").references(() => userProfiles.id),
  stripePaymentId: text("stripe_payment_id"),
  creditsGranted: integer("credits_granted"),
  amount: integer("amount"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const keepers = pgTable("keepers", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  teamId: uuid("team_id"), // Can reference either teams.id or offlineTeams.id
  playerId: uuid("player_id").references(() => nflPlayers.id),
  keeperPrice: integer("keeper_price").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const leagueInvitations = pgTable("league_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  email: text("email").notNull(),
  invitedBy: text("invited_by").references(() => userProfiles.id),
  status: text("status").default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const apiUpdates = pgTable("api_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull(),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).defaultNow(),
  playerCount: integer("player_count"),
  status: text("status").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const draftStateHistory = pgTable("draft_state_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  leagueId: uuid("league_id").references(() => leagues.id),
  draftState: jsonb("draft_state").notNull(), // Always store a valid draft state
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
