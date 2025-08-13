import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  draftedPlayers,
  nflPlayers,
  teams,
  leagues,
  userProfiles,
  offlineTeams,
} from "@/app/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ league_id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const leagueId = resolvedParams.league_id;

    // Get league and settings
    const league = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    if (!league.length) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    const leagueData = league[0];

    // Get all regular teams with owner information
    const regularTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        ownerId: teams.ownerId,
        budget: teams.budget,
        draftOrder: teams.draftOrder,
        ownerFirstName: userProfiles.firstName,
        ownerLastName: userProfiles.lastName,
      })
      .from(teams)
      .leftJoin(userProfiles, eq(teams.ownerId, userProfiles.id))
      .where(eq(teams.leagueId, leagueId))
      .orderBy(teams.draftOrder);

    // Get all offline teams
    const offlineTeamsList = await db
      .select({
        id: offlineTeams.id,
        name: offlineTeams.name,
        budget: offlineTeams.budget,
        draftOrder: offlineTeams.draftOrder,
      })
      .from(offlineTeams)
      .where(eq(offlineTeams.leagueId, leagueId))
      .orderBy(offlineTeams.draftOrder);

    // Combine all teams and add isOffline flag
    const allTeams = [
      ...regularTeams.map(team => ({ ...team, isOffline: false })),
      ...offlineTeamsList.map(team => ({ 
        ...team, 
        ownerId: null,
        ownerFirstName: null,
        ownerLastName: null,
        isOffline: true 
      }))
    ];

    // Get all drafted players with player and team info, ordered by creation time
    // First get players drafted to regular teams
    const regularTeamDraftedPlayers = await db
      .select({
        id: draftedPlayers.id,
        draftPrice: draftedPlayers.draftPrice,
        teamId: draftedPlayers.teamId,
        playerId: draftedPlayers.playerId,
        createdAt: draftedPlayers.createdAt,
        teamName: teams.name,
        playerFirstName: nflPlayers.firstName,
        playerLastName: nflPlayers.lastName,
        playerPosition: nflPlayers.position,
        playerTeam: nflPlayers.team,
      })
      .from(draftedPlayers)
      .leftJoin(nflPlayers, eq(draftedPlayers.playerId, nflPlayers.id))
      .leftJoin(teams, eq(draftedPlayers.teamId, teams.id))
      .where(and(
        eq(draftedPlayers.leagueId, leagueId),
        eq(draftedPlayers.teamType, 'regular')
      ))
      .orderBy(draftedPlayers.createdAt);

    // Then get players drafted to offline teams
    const offlineTeamDraftedPlayers = await db
      .select({
        id: draftedPlayers.id,
        draftPrice: draftedPlayers.draftPrice,
        teamId: draftedPlayers.teamId,
        playerId: draftedPlayers.playerId,
        createdAt: draftedPlayers.createdAt,
        teamName: offlineTeams.name,
        playerFirstName: nflPlayers.firstName,
        playerLastName: nflPlayers.lastName,
        playerPosition: nflPlayers.position,
        playerTeam: nflPlayers.team,
      })
      .from(draftedPlayers)
      .leftJoin(nflPlayers, eq(draftedPlayers.playerId, nflPlayers.id))
      .leftJoin(offlineTeams, eq(draftedPlayers.teamId, offlineTeams.id))
      .where(and(
        eq(draftedPlayers.leagueId, leagueId),
        eq(draftedPlayers.teamType, 'offline')
      ))
      .orderBy(draftedPlayers.createdAt);

    // Combine all drafted players
    const allDraftedPlayers = [...regularTeamDraftedPlayers, ...offlineTeamDraftedPlayers];

    console.log(`Found ${allDraftedPlayers.length} drafted players for league ${leagueId}`);
    console.log(`Found ${allTeams.length} teams for league ${leagueId}`);
    console.log(`Regular teams: ${regularTeams.length}, Offline teams: ${offlineTeamsList.length}`);
    console.log(`Regular team drafted players: ${regularTeamDraftedPlayers.length}, Offline team drafted players: ${offlineTeamDraftedPlayers.length}`);

    // Validate that we have data to export
    if (allDraftedPlayers.length === 0) {
      return NextResponse.json(
        { error: "No drafted players found for this league" },
        { status: 404 }
      );
    }

    if (allTeams.length === 0) {
      return NextResponse.json(
        { error: "No teams found for this league" },
        { status: 404 }
      );
    }

    // Build roster slots based on league settings
    const slotOrder = ["QB", "RB", "WR", "TE", "FLEX", "K", "DST", "BENCH"] as const;
    const slotCounts: Record<typeof slotOrder[number], number> = {
      QB: leagueData.qbSlots || 0,
      RB: leagueData.rbSlots || 0,
      WR: leagueData.wrSlots || 0,
      TE: leagueData.teSlots || 0,
      FLEX: leagueData.flexSlots || 0,
      K: leagueData.kSlots || 0,
      DST: leagueData.dstSlots || 0,
      BENCH: leagueData.benchSlots || 0,
    };

    // Function to assign players to roster slots
    function assignPlayersToSlots(
      players: typeof allDraftedPlayers,
      slotCounts: Record<typeof slotOrder[number], number>
    ): Record<string, (typeof allDraftedPlayers[0] | null)[]> {
      const slots: Record<string, (typeof allDraftedPlayers[0] | null)[]> = {};
      slotOrder.forEach((slot) => {
        slots[slot] = [];
      });

      // Group players by position
      const grouped: Record<string, typeof allDraftedPlayers> = {
        QB: [],
        RB: [],
        WR: [],
        TE: [],
        K: [],
        DST: [],
        FLEX: [],
        BENCH: [],
      };

      players.forEach((player) => {
        const pos = player.playerPosition?.toUpperCase();
        if (pos && grouped[pos]) {
          grouped[pos].push(player);
        } else if (pos === "DEF" || pos === "DST") {
          grouped["DST"].push(player);
        } else {
          grouped["BENCH"].push(player);
        }
      });

      // Fill direct position slots
      (["QB", "RB", "WR", "TE", "K", "DST"] as const).forEach((slot) => {
        for (let i = 0; i < slotCounts[slot]; i++) {
          const player = grouped[slot].shift();
          slots[slot].push(player || null);
        }
      });

      // Fill FLEX slots
      for (let i = 0; i < slotCounts["FLEX"]; i++) {
        let player = null;
        for (const pos of (["RB", "WR", "TE"] as const)) {
          if (grouped[pos].length > 0) {
            player = grouped[pos].shift()!;
            break;
          }
        }
        slots["FLEX"].push(player);
      }

      // Fill BENCH slots with remaining players
      for (let i = 0; i < slotCounts["BENCH"]; i++) {
        let player = null;
        for (const pos of (["RB", "WR", "TE", "QB", "K", "DST"] as const)) {
          if (grouped[pos].length > 0) {
            player = grouped[pos].shift()!;
            break;
          }
        }
        slots["BENCH"].push(player);
      }

      return slots;
    }

    // Generate CSV content
    let csvContent = "";

    // Sheet 1: Team Rosters (Positions as rows, Teams as columns)
    csvContent += "Team Rosters\n\n";
    
    // Header row with team names and owners
    csvContent += "Position,";
    allTeams.forEach((team) => {
      const ownerName = team.isOffline 
        ? "Offline Team" 
        : `${team.ownerFirstName || ""} ${team.ownerLastName || ""}`.trim() || "Unknown Owner";
      const teamName = team.name || "Unknown Team";
      csvContent += `"${teamName} (${ownerName})",`;
    });
    csvContent = csvContent.slice(0, -1) + "\n"; // Remove last comma and add newline

    // Generate roster data for each team
    const teamRosters: Record<string, Record<string, (typeof allDraftedPlayers[0] | null)[]>> = {};
    allTeams.forEach((team) => {
      const teamPlayers = allDraftedPlayers.filter((p) => p.teamId === team.id);
      teamRosters[team.id] = assignPlayersToSlots(teamPlayers, slotCounts);
    });

    // Add rows for each position slot
    slotOrder.forEach((slot) => {
      for (let i = 0; i < slotCounts[slot]; i++) {
        const slotLabel = slotCounts[slot] > 1 ? `${slot}${i + 1}` : slot;
        csvContent += `${slotLabel},`;
        
        allTeams.forEach((team) => {
          const player = teamRosters[team.id][slot][i];
          if (player) {
            const playerName = `${player.playerFirstName || ""} ${player.playerLastName || ""}`.trim();
            const position = player.playerPosition || "Unknown";
            const team = player.playerTeam || "FA";
            const price = player.draftPrice || 0;
            csvContent += `"${playerName} (${position} - ${team}) $${price}",`;
          } else {
            csvContent += ",";
          }
        });
        csvContent = csvContent.slice(0, -1) + "\n"; // Remove last comma and add newline
      }
    });

    // Sheet 2: Draft Recap
    csvContent += "\n\nDraft Recap\n\n";
    csvContent += "Pick #,Player Name,Position,Team,Price,Drafted By\n";

    allDraftedPlayers.forEach((player, index) => {
      const pickNumber = index + 1;
      const playerName = `${player.playerFirstName || ""} ${player.playerLastName || ""}`.trim();
      const position = player.playerPosition || "Unknown";
      const team = player.playerTeam || "FA";
      const price = player.draftPrice || 0;
      const draftedBy = player.teamName || "Unknown Team";
      
      csvContent += `${pickNumber},"${playerName}","${position}","${team}",${price},"${draftedBy}"\n`;
    });

    // Set response headers for CSV download
    const response = new NextResponse(csvContent);
    response.headers.set("Content-Type", "text/csv");
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${leagueData.name}-draft-${new Date().toISOString().split('T')[0]}.csv"`
    );

    return response;
  } catch (error) {
    console.error("Error generating CSV:", error);
    return NextResponse.json(
      { error: "Failed to generate CSV" },
      { status: 500 }
    );
  }
} 