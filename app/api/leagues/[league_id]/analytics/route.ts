import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  draftStateHistory,
  draftedPlayers,
  nflPlayers,
  teams,
  leagues,
} from "@/app/schema";
import { eq, desc, asc, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const leagueId = resolvedParams.league_id;

    // Get league info
    const league = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    if (!league.length) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    // Get all teams in the league
    const allTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, leagueId));

    // Get all drafted players with player info
    const allDraftedPlayers = await db
      .select({
        id: draftedPlayers.id,
        draftPrice: draftedPlayers.draftPrice,
        teamId: draftedPlayers.teamId,
        playerId: draftedPlayers.playerId,
        createdAt: draftedPlayers.createdAt,
        playerFirstName: nflPlayers.firstName,
        playerLastName: nflPlayers.lastName,
        playerPosition: nflPlayers.position,
        playerTeam: nflPlayers.team,
      })
      .from(draftedPlayers)
      .leftJoin(nflPlayers, eq(draftedPlayers.playerId, nflPlayers.id))
      .where(eq(draftedPlayers.leagueId, leagueId))
      .orderBy(asc(draftedPlayers.createdAt));

    // Get draft state history for bid analysis
    const draftHistory = await db
      .select()
      .from(draftStateHistory)
      .where(eq(draftStateHistory.leagueId, leagueId))
      .orderBy(asc(draftStateHistory.createdAt));

    // 1. Most bid on players (from draft_state_history)
    const mostBidOnPlayers = analyzeMostBidOnPlayers(draftHistory);

    // 2. Positional spending breakdown (league-wide)
    const positionalSpending = analyzePositionalSpending(allDraftedPlayers, allTeams);

    // 3. Price inflation over time
    const priceInflation = analyzePriceInflation(allDraftedPlayers);

    // 4. Budget hoarders vs early spenders
    const spendingPatterns = analyzeSpendingPatterns(allDraftedPlayers, allTeams);

    // 5. Team-specific analytics
    const teamAnalytics = analyzeTeamAnalytics(allDraftedPlayers, allTeams);

    // 6. Draft momentum map
    const draftMomentum = analyzeDraftMomentum(allDraftedPlayers, allTeams);

    return NextResponse.json({
      success: true,
      analytics: {
        mostBidOnPlayers,
        positionalSpending,
        priceInflation,
        spendingPatterns,
        teamAnalytics,
        draftMomentum,
      },
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper functions to analyze the data
function analyzeMostBidOnPlayers(draftHistory: any[]) {
  const bidCounts: Record<string, { count: number; playerName: string; playerId: string }> = {};
  
  // Group events by nominated player to track bid counts
  let currentNominatedPlayer: string | null = null;
  let currentPlayerName: string = '';
  
  draftHistory.forEach((event) => {
    const draftState = event.draftState;
    
    // Track when a new player is nominated
    if (draftState?.nominatedPlayer?.id && draftState.nominatedPlayer.id !== currentNominatedPlayer) {
      currentNominatedPlayer = draftState.nominatedPlayer.id;
      currentPlayerName = draftState.nominatedPlayer.name || 'Unknown Player';
      
      if (!bidCounts[currentNominatedPlayer]) {
        bidCounts[currentNominatedPlayer] = { count: 0, playerName: currentPlayerName, playerId: currentNominatedPlayer };
      }
    }
    
    // Count bids for the current nominated player
    if (currentNominatedPlayer && draftState?.bidHistory && Array.isArray(draftState.bidHistory)) {
      bidCounts[currentNominatedPlayer].count = Math.max(
        bidCounts[currentNominatedPlayer].count,
        draftState.bidHistory.length
      );
    }
  });

  return Object.values(bidCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function analyzePositionalSpending(draftedPlayers: any[], teams: any[]) {
  const totalBudget = teams.reduce((sum, team) => sum + (team.budget || 200), 0);
  const positionSpending: Record<string, { total: number; percentage: number; count: number }> = {};
  
  draftedPlayers.forEach((player) => {
    const position = player.playerPosition;
    if (!positionSpending[position]) {
      positionSpending[position] = { total: 0, percentage: 0, count: 0 };
    }
    positionSpending[position].total += player.draftPrice;
    positionSpending[position].count++;
  });

  // Calculate percentages
  Object.keys(positionSpending).forEach((position) => {
    positionSpending[position].percentage = (positionSpending[position].total / totalBudget) * 100;
  });

  return positionSpending;
}

function analyzePriceInflation(draftedPlayers: any[]) {
  if (draftedPlayers.length === 0) return [];

  // Group players by draft order (creation time) and calculate average price per group
  const playersByOrder = draftedPlayers.map((player, index) => ({
    ...player,
    draftOrder: index + 1,
  }));

  // Calculate moving average of prices
  const windowSize = Math.max(1, Math.floor(playersByOrder.length / 10));
  const priceTrend = [];

  for (let i = windowSize - 1; i < playersByOrder.length; i++) {
    const window = playersByOrder.slice(i - windowSize + 1, i + 1);
    const avgPrice = window.reduce((sum, p) => sum + p.draftPrice, 0) / window.length;
    priceTrend.push({
      draftOrder: i + 1,
      averagePrice: avgPrice,
      playerCount: window.length,
    });
  }

  return priceTrend;
}

function analyzeSpendingPatterns(draftedPlayers: any[], teams: any[]) {
  const teamSpending: Record<string, { 
    teamName: string; 
    totalSpent: number; 
    remainingBudget: number; 
    earlySpending: number; 
    lateSpending: number;
    spendingPattern: 'early' | 'balanced' | 'late';
  }> = {};

  // Initialize team data
  teams.forEach((team) => {
    teamSpending[team.id] = {
      teamName: team.name,
      totalSpent: 0,
      remainingBudget: team.budget || 200,
      earlySpending: 0,
      lateSpending: 0,
      spendingPattern: 'balanced',
    };
  });

  // Calculate spending patterns
  const totalPlayers = draftedPlayers.length;
  const earlyThreshold = Math.floor(totalPlayers * 0.33);
  const lateThreshold = Math.floor(totalPlayers * 0.67);

  draftedPlayers.forEach((player, index) => {
    const team = teamSpending[player.teamId];
    if (team) {
      team.totalSpent += player.draftPrice;
      team.remainingBudget -= player.draftPrice;

      if (index < earlyThreshold) {
        team.earlySpending += player.draftPrice;
      } else if (index >= lateThreshold) {
        team.lateSpending += player.draftPrice;
      }
    }
  });

  // Determine spending pattern
  Object.values(teamSpending).forEach((team) => {
    const earlyPercentage = (team.earlySpending / team.totalSpent) * 100;
    const latePercentage = (team.lateSpending / team.totalSpent) * 100;

    if (earlyPercentage > 50) {
      team.spendingPattern = 'early';
    } else if (latePercentage > 50) {
      team.spendingPattern = 'late';
    } else {
      team.spendingPattern = 'balanced';
    }
  });

  return Object.values(teamSpending);
}

function analyzeTeamAnalytics(draftedPlayers: any[], teams: any[]) {
  const teamAnalytics: Record<string, {
    teamName: string;
    totalSpent: number;
    remainingBudget: number;
    playerCount: number;
    positionalBreakdown: Record<string, { total: number; percentage: number; count: number }>;
  }> = {};

  // Initialize team analytics
  teams.forEach((team) => {
    teamAnalytics[team.id] = {
      teamName: team.name,
      totalSpent: 0,
      remainingBudget: team.budget || 200,
      playerCount: 0,
      positionalBreakdown: {},
    };
  });

  // Calculate team-specific analytics
  draftedPlayers.forEach((player) => {
    const team = teamAnalytics[player.teamId];
    if (team) {
      team.totalSpent += player.draftPrice;
      team.remainingBudget -= player.draftPrice;
      team.playerCount++;

      const position = player.playerPosition;
      if (!team.positionalBreakdown[position]) {
        team.positionalBreakdown[position] = { total: 0, percentage: 0, count: 0 };
      }
      team.positionalBreakdown[position].total += player.draftPrice;
      team.positionalBreakdown[position].count++;
    }
  });

  // Calculate percentages for each team
  Object.values(teamAnalytics).forEach((team) => {
    Object.keys(team.positionalBreakdown).forEach((position) => {
      team.positionalBreakdown[position].percentage = 
        (team.positionalBreakdown[position].total / team.totalSpent) * 100;
    });
  });

  return Object.values(teamAnalytics);
}

function analyzeDraftMomentum(draftedPlayers: any[], teams: any[]) {
  const momentumData: Record<string, {
    teamName: string;
    budgetHistory: Array<{ draftOrder: number; remainingBudget: number; spent: number }>;
    turningPoints: Array<{ draftOrder: number; description: string; budgetChange: number }>;
  }> = {};

  // Initialize momentum data
  teams.forEach((team) => {
    momentumData[team.id] = {
      teamName: team.name,
      budgetHistory: [{ draftOrder: 0, remainingBudget: team.budget || 200, spent: 0 }],
      turningPoints: [],
    };
  });

  // Build budget history
  draftedPlayers.forEach((player, index) => {
    const team = momentumData[player.teamId];
    if (team) {
      const lastEntry = team.budgetHistory[team.budgetHistory.length - 1];
      const newEntry = {
        draftOrder: index + 1,
        remainingBudget: lastEntry.remainingBudget - player.draftPrice,
        spent: lastEntry.spent + player.draftPrice,
      };
      team.budgetHistory.push(newEntry);

      // Detect turning points (significant budget changes)
      const budgetChange = player.draftPrice;
      const budgetPercentage = (budgetChange / (team.budgetHistory[0].remainingBudget)) * 100;
      
      if (budgetPercentage > 15) { // More than 15% of total budget
        team.turningPoints.push({
          draftOrder: index + 1,
          description: `Big spend on ${player.playerFirstName} ${player.playerLastName} ($${player.draftPrice})`,
          budgetChange: -budgetChange,
        });
      }
    }
  });

  return Object.values(momentumData);
} 