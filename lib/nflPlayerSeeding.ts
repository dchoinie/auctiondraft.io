import { db } from "./db";
import { nflPlayers, apiUpdates } from "@/app/schema";
import { eq, desc } from "drizzle-orm";

// Type definitions for Sleeper API response
interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string;
  team: string | null;
  fantasy_positions: string[];
  status: string;
  injury_status: string | null;
  years_exp: number | null;
  age: number | null;
  search_rank: number | null;
  depth_chart_position: number | null;
  search_full_name?: string; // Optional field for filtering out junk records
}

interface SleeperPlayersResponse {
  [playerId: string]: SleeperPlayer;
}

interface SeedingResult {
  success: boolean;
  playersUpdated: number;
  playersCreated: number;
  error?: string;
}

const SLEEPER_API_URL = "https://api.sleeper.app/v1/players/nfl";
const ENDPOINT_NAME = "sleeper_nfl_players";

/**
 * Check if NFL players data needs to be refreshed
 * Used by platform administrators to determine if an update is needed.
 * Returns true if:
 * - No players exist in the database
 * - No successful API update exists
 * - Last successful update was more than 24 hours ago
 */
export async function shouldRefreshPlayerData(): Promise<boolean> {
  try {
    // Check if we have any players
    const playerCount = await db
      .select({ count: nflPlayers.id })
      .from(nflPlayers);

    if (playerCount.length === 0) {
      return true;
    }

    // Check when we last successfully updated
    const lastUpdate = await db
      .select()
      .from(apiUpdates)
      .where(eq(apiUpdates.endpoint, ENDPOINT_NAME))
      .orderBy(desc(apiUpdates.lastUpdated))
      .limit(1);

    if (lastUpdate.length === 0) {
      return true;
    }

    const lastSuccessfulUpdate = lastUpdate.find(
      (update) => update.status === "success"
    );

    if (!lastSuccessfulUpdate) {
      return true;
    }

    // Check if last update was more than 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return lastSuccessfulUpdate.lastUpdated
      ? lastSuccessfulUpdate.lastUpdated < twentyFourHoursAgo
      : true;
  } catch (error) {
    console.error("Error checking if player data needs refresh:", error);
    return true; // Default to refresh if we can't check
  }
}

/**
 * Fetch NFL players from Sleeper API
 */
export async function fetchPlayersFromSleeper(): Promise<SleeperPlayersResponse> {
  const response = await fetch(SLEEPER_API_URL);

  if (!response.ok) {
    throw new Error(
      `Sleeper API error: ${response.status} ${response.statusText}`
    );
  }

  const data: SleeperPlayersResponse = await response.json();
  return data;
}

// Define relevant fantasy positions for filtering
const RELEVANT_FANTASY_POSITIONS = [
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DL",
  "DE",
  "DT",
  "LB",
  "OLB",
  "ILB",
  "DB",
  "S",
  "FS",
  "SS",
];

/**
 * Check if a player should be imported based on status and fantasy positions
 */
function shouldImportPlayer(player: SleeperPlayer): boolean {
  // Filter out records without required fields (junk records)
  if (!player.player_id || !player.search_full_name) {
    return false;
  }

  // Filter out inactive and retired players (keep Active, Injured Reserve, Practice Squad, etc.)
  if (player.status === "Inactive" || player.status === "Retired") {
    return false;
  }

  // Filter out players without fantasy positions array or empty array
  if (
    !player.fantasy_positions ||
    !Array.isArray(player.fantasy_positions) ||
    player.fantasy_positions.length === 0
  ) {
    return false;
  }

  // Filter out players with search_rank higher than 999
  if (player.search_rank !== null && player.search_rank > 999) {
    return false;
  }

  // Check if player has at least one relevant fantasy position
  const hasRelevantPosition = player.fantasy_positions.some((position) =>
    RELEVANT_FANTASY_POSITIONS.includes(position)
  );

  return hasRelevantPosition;
}

/**
 * Transform Sleeper API player data to our database format
 */
function transformSleeperPlayer(playerId: string, player: SleeperPlayer) {
  // Handle depth_chart_position - convert to number or null if not numeric
  let depthChartPosition = null;
  if (
    player.depth_chart_position !== null &&
    player.depth_chart_position !== undefined
  ) {
    const parsed = parseInt(String(player.depth_chart_position), 10);
    if (!isNaN(parsed)) {
      depthChartPosition = parsed;
    }
  }

  return {
    sleeperId: playerId,
    firstName: player.first_name || "",
    lastName: player.last_name || "",
    position: player.position || "",
    team: player.team || null,
    fantasyPositions: player.fantasy_positions || [],
    status: player.status || "",
    injuryStatus: player.injury_status || null,
    yearsExp: player.years_exp || null,
    age: player.age || null,
    searchRank: player.search_rank || null,
    depthChartPosition,
    updatedAt: new Date(),
  };
}

/**
 * Seed NFL players from Sleeper API
 */
export async function seedNFLPlayers(): Promise<SeedingResult> {
  let playersCreated = 0;
  let playersUpdated = 0;

  try {
    console.log("Fetching NFL players from Sleeper API...");
    const sleeperPlayers = await fetchPlayersFromSleeper();

    console.log(
      `Found ${Object.keys(sleeperPlayers).length} players from Sleeper API`
    );

    // Filter players before processing
    const playerEntries = Object.entries(sleeperPlayers);

    // Filter players before processing
    const filteredEntries = playerEntries.filter(([playerId, playerData]) =>
      shouldImportPlayer(playerData)
    );

    console.log(
      `Importing ${filteredEntries.length} relevant players to database`
    );

    // Process players in batches to avoid overwhelming the database
    const batchSize = 100;

    for (let i = 0; i < filteredEntries.length; i += batchSize) {
      const batch = filteredEntries.slice(i, i + batchSize);

      for (const [playerId, playerData] of batch) {
        try {
          const transformedPlayer = transformSleeperPlayer(
            playerId,
            playerData
          );

          // Check if player already exists
          const existingPlayer = await db
            .select()
            .from(nflPlayers)
            .where(eq(nflPlayers.sleeperId, playerId))
            .limit(1);

          if (existingPlayer.length > 0) {
            // Update existing player
            await db
              .update(nflPlayers)
              .set(transformedPlayer)
              .where(eq(nflPlayers.sleeperId, playerId));
            playersUpdated++;
          } else {
            // Create new player
            await db.insert(nflPlayers).values({
              ...transformedPlayer,
              createdAt: new Date(),
            });
            playersCreated++;
          }
        } catch (playerError) {
          console.error(`Error processing player ${playerId}:`, playerError);
          // Continue processing other players
        }
      }

      // Log progress
      console.log(
        `Processed ${Math.min(i + batchSize, filteredEntries.length)} / ${filteredEntries.length} players`
      );
    }

    // Record successful API update
    await db.insert(apiUpdates).values({
      endpoint: ENDPOINT_NAME,
      lastUpdated: new Date(),
      playerCount: playersCreated + playersUpdated,
      status: "success",
      errorMessage: null,
    });

    console.log(
      `NFL players seeding completed: ${playersCreated} created, ${playersUpdated} updated`
    );

    return {
      success: true,
      playersCreated,
      playersUpdated,
    };
  } catch (error) {
    console.error("Error seeding NFL players:", error);

    // Record failed API update
    await db.insert(apiUpdates).values({
      endpoint: ENDPOINT_NAME,
      lastUpdated: new Date(),
      playerCount: 0,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      success: false,
      playersCreated,
      playersUpdated,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get the last API update information
 */
export async function getLastPlayerUpdate() {
  const lastUpdate = await db
    .select()
    .from(apiUpdates)
    .where(eq(apiUpdates.endpoint, ENDPOINT_NAME))
    .orderBy(desc(apiUpdates.lastUpdated))
    .limit(1);

  return lastUpdate[0] || null;
}

/**
 * Get player count from database
 */
export async function getPlayerCount(): Promise<number> {
  const result = await db.select({ count: nflPlayers.id }).from(nflPlayers);

  return result.length;
}
