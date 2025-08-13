"use client";

import React from "react";
import { useOfflineTeamStore } from "@/stores/offlineTeamStore";
import { useLeagueTeams, Team as OnlineTeam } from "@/stores/teamStore";
import { useLeagueKeepers } from "@/stores/keepersStore";
import { useDraftedPlayersAuto, useDraftedPlayersStore } from "@/stores/draftedPlayersStore";
import { useLeagueMembership, League } from "@/stores/leagueStore";
import { usePlayers, usePlayersStore } from "@/stores/playersStore";
import type { Player } from "@/stores/playersStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";

interface OfflineDraftProps {
  leagueId: string;
}

export default function OfflineDraft({ leagueId }: OfflineDraftProps) {
  const { teams: offlineTeams, fetchTeams: fetchOfflineTeams } = useOfflineTeamStore();
  const draftedPlayers = useDraftedPlayersAuto(leagueId);
  const fetchDraftedPlayers = useDraftedPlayersStore((s) => s.fetchDraftedPlayers);
  const { leagues, loading: leaguesLoading } = useLeagueMembership();
  const league = leagues.find((l: League) => l.id === leagueId);

  // Local UI state
  const [search, setSearch] = React.useState("");
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = React.useState<string | undefined>(undefined);
  const [bidAmount, setBidAmount] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);
  // Online teams and league admin team
  const { teams: onlineTeams } = useLeagueTeams(leagueId);
  const adminTeam = React.useMemo(() => {
    if (!league?.ownerId) return undefined;
    return onlineTeams.find((t: OnlineTeam) => t.ownerId === league.ownerId);
  }, [onlineTeams, league?.ownerId]);
  const combinedTeams = React.useMemo(() => {
    return adminTeam ? [...offlineTeams, adminTeam] : [...offlineTeams];
  }, [offlineTeams, adminTeam]);
  // Keepers used only to exclude from round/pick calculations
  const { keepers } = useLeagueKeepers(leagueId);

  // Players table state
  const [positionFilter, setPositionFilter] = React.useState<string>("ALL");
  const [page, setPage] = React.useState<number>(1);
  const [filteredPage, setFilteredPage] = React.useState<number>(1);
  const limit = 25;
  const playersStore = usePlayersStore();
  const { players: tablePlayers, pagination, loading: playersLoading, fetchPlayersPage } = usePlayers(page, limit);

  React.useEffect(() => {
    // Fetch whenever page changes; position/search handled below via direct fetch
    fetchPlayersPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchFilteredPlayers = React.useCallback(async (pageNum: number = 1) => {
    const controller = new AbortController();
    try {
      playersStore.setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(pageNum));
      params.set("limit", String(limit));
      if (search) params.set("search", search);
      if (positionFilter && positionFilter !== "ALL") params.set("position", positionFilter);
      const res = await fetch(`/api/players?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error("Failed to fetch players");
      const data = await res.json();
      const timestamp = Date.now();
      playersStore.setError(null);
      setFilteredData({ players: data.players, pagination: data.pagination, timestamp });
    } catch (e: unknown) {
      const err = e as { name?: string; message?: string } | undefined;
      if (err?.name !== "AbortError") {
        playersStore.setError(err?.message || "Failed to fetch players");
      }
    } finally {
      playersStore.setLoading(false);
    }
  }, [search, positionFilter, limit, playersStore]);

  React.useEffect(() => {
    // When search or position changes, reset to page 1 and fetch with query
    setFilteredPage(1);
    fetchFilteredPlayers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, positionFilter]);

  // Handle filtered page changes
  React.useEffect(() => {
    const hasActiveFilters = (search?.trim().length ?? 0) > 0 || (positionFilter && positionFilter !== "ALL");
    if (hasActiveFilters) {
      fetchFilteredPlayers(filteredPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredPage]);

  // Local filtered data fallback when using search/filters
  const [filteredData, setFilteredData] = React.useState<{ players: ReturnType<typeof usePlayers>["players"]; pagination: ReturnType<typeof usePlayers>["pagination"]; timestamp: number } | null>(null);
  const visiblePlayers = filteredData ? filteredData.players : tablePlayers;
  const visiblePagination = filteredData ? filteredData.pagination : pagination;

  // Exclude players already drafted in this league
  const draftedPlayerIds = React.useMemo(() => new Set(draftedPlayers.map((dp) => dp.playerId)), [draftedPlayers]);
  const availablePlayers = React.useMemo(() => visiblePlayers.filter((p) => !draftedPlayerIds.has(p.id)), [visiblePlayers, draftedPlayerIds]);

  // Selected player details (from cache/table); fetch by id if missing
  const [selectedDetails, setSelectedDetails] = React.useState<Player | null>(null);
  const [selectedDetailsLoading, setSelectedDetailsLoading] = React.useState(false);

  const selectedPlayer = React.useMemo(() => {
    if (!selectedPlayerId) return null;
    return selectedDetails || visiblePlayers.find((p) => p.id === selectedPlayerId) || null;
  }, [selectedPlayerId, selectedDetails, visiblePlayers]);

  const handleSelectPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId);
    // Try to find player in current table
    const fromVisible = visiblePlayers.find((p) => p.id === playerId);
    if (fromVisible) {
      setSelectedDetails(fromVisible);
      setSelectedDetailsLoading(false);
      return;
    }
    // Fallback: fetch details without toggling global table loading
    setSelectedDetailsLoading(true);
    fetch(`/api/players/${playerId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed to fetch player"))))
      .then((data) => {
        if (data?.player) setSelectedDetails(data.player as Player);
      })
      .catch(() => {})
      .finally(() => setSelectedDetailsLoading(false));
  };

  React.useEffect(() => {
    // Clear details when deselecting
    if (!selectedPlayerId) setSelectedDetails(null);
  }, [selectedPlayerId]);

  // Ensure selected team remains valid
  React.useEffect(() => {
    if (selectedTeamId && !combinedTeams.some((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(undefined);
    }
  }, [combinedTeams, selectedTeamId]);

  // Derived values
  const totalRosterSpots = React.useMemo(() => {
    if (!league?.settings) return 0;
    const s = league.settings;
    return (
      (s.qbSlots ?? 0) +
      (s.rbSlots ?? 0) +
      (s.wrSlots ?? 0) +
      (s.teSlots ?? 0) +
      (s.kSlots ?? 0) +
      (s.dstSlots ?? 0) +
      (s.flexSlots ?? 0) +
      (s.benchSlots ?? 0)
    );
  }, [league?.settings]);

  const draftedCountByTeam: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const dp of draftedPlayers) {
      map[dp.teamId] = (map[dp.teamId] ?? 0) + 1;
    }
    return map;
  }, [draftedPlayers]);

  const draftedSpentByTeam: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const dp of draftedPlayers) {
      map[dp.teamId] = (map[dp.teamId] ?? 0) + (dp.draftPrice ?? 0);
    }
    return map;
  }, [draftedPlayers]);

  const remainingSpotsByTeam: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {};
    combinedTeams.forEach((t) => {
      const draftedCount = draftedCountByTeam[t.id] ?? 0;
      map[t.id] = Math.max(0, totalRosterSpots - draftedCount);
    });
    return map;
  }, [combinedTeams, draftedCountByTeam, totalRosterSpots]);

  // Remaining budget state: starts at league startingBudget and subtracts draftedPlayers total per team
  const [remainingBudgetByTeam, setRemainingBudgetByTeam] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    const starting = league?.settings?.startingBudget ?? 0;
    const map: Record<string, number> = {};
    combinedTeams.forEach((t) => {
      const spentDrafted = draftedSpentByTeam[t.id] ?? 0;
      map[t.id] = Math.max(0, starting - spentDrafted);
    });
    setRemainingBudgetByTeam(map);
  }, [combinedTeams, draftedSpentByTeam, league?.settings?.startingBudget]);

  const maxBidByTeam: Record<string, number> = React.useMemo(() => {
    const map: Record<string, number> = {};
    combinedTeams.forEach((t) => {
      const remainingSpots = Math.max(0, remainingSpotsByTeam[t.id] ?? 0);
      const remainingBudget = Math.max(0, remainingBudgetByTeam[t.id] ?? 0);
      // If no roster spots remain, team cannot bid
      if (remainingSpots === 0) {
        map[t.id] = 0;
        return;
      }
      // Standard auction max bid formula: remainingBudget - (remainingSpots - 1)
      const maxBid = remainingBudget - (remainingSpots - 1);
      map[t.id] = Math.max(0, Math.min(remainingBudget, Math.floor(maxBid)));
    });
    return map;
  }, [combinedTeams, remainingSpotsByTeam, remainingBudgetByTeam]);

  // Compute current nominator based on picks made, draft type (snake/linear), and draft order
  const { currentNominatorTeamId, sortedParticipants } = React.useMemo(() => {
    const participants = [...combinedTeams].sort((a, b) => {
      const ao = a.draftOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.draftOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return (a.name || "").localeCompare(b.name || "");
    });
    const participantIds = new Set(participants.map((t) => t.id));
    // Exclude keepers from pick count
    const keeperIds = new Set(keepers.map((k) => k.playerId));
    const picksMade = draftedPlayers.filter(
      (dp) => participantIds.has(dp.teamId) && !keeperIds.has(dp.playerId)
    ).length;
    const numTeams = Math.max(1, participants.length);
    const roundIndex = Math.floor(picksMade / numTeams); // 0-based
    const pickInRoundIndex = picksMade % numTeams; // 0..numTeams-1
    const draftType = (league?.settings?.draftType || "linear").toLowerCase();
    const isSnake = draftType === "snake";
    const forward = !isSnake || roundIndex % 2 === 0;
    const idx = forward ? pickInRoundIndex : numTeams - 1 - pickInRoundIndex;
    const teamId = participants[idx]?.id;
    return { currentNominatorTeamId: teamId, sortedParticipants: participants };
  }, [combinedTeams, draftedPlayers, keepers, league?.settings?.draftType]);

  // Effects
  React.useEffect(() => {
    fetchOfflineTeams(leagueId);
    fetchDraftedPlayers(leagueId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  // Handlers
  const handleDraft = async () => {
    if (!selectedPlayerId || !selectedTeamId) {
      toast.error("Select a player and a team first");
      return;
    }
    const price = Number(bidAmount);
    if (!Number.isFinite(price) || price <= 0) {
      toast.error("Enter a valid bid amount");
      return;
    }
    const team = combinedTeams.find((t) => t.id === selectedTeamId);
    if (!team) {
      toast.error("Invalid team selected");
      return;
    }
    const maxBid = maxBidByTeam[team.id] ?? 0;
    if (price > maxBid) {
      toast.error(`Bid exceeds max bid for ${team.name} ($${maxBid})`);
      return;
    }

    // Prevent drafting already drafted player in this league
    const alreadyDrafted = draftedPlayers.some((dp) => dp.playerId === selectedPlayerId);
    if (alreadyDrafted) {
      toast.error("Player already drafted in this league");
      return;
    }

    try {
      setIsSaving(true);
      
      // Determine if this is an offline team or regular team
      const isOfflineTeam = offlineTeams.some(t => t.id === team.id);
      const endpoint = isOfflineTeam 
        ? `/api/leagues/${leagueId}/offline-teams/${team.id}/draft-player`
        : `/api/leagues/${leagueId}/teams/${team.id}/draft-player`;
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selectedPlayerId, draftPrice: price }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to draft player");
      }

      toast.success("Player drafted successfully");
      // Optimistically update remaining budget state
      setRemainingBudgetByTeam((prev) => {
        const starting = league?.settings?.startingBudget ?? 0;
        const current = prev[team.id] ?? Math.max(0, starting - (draftedSpentByTeam[team.id] ?? 0));
        return { ...prev, [team.id]: Math.max(0, current - price) };
      });

      // Refresh stores
      await Promise.all([
        fetchDraftedPlayers(leagueId),
        fetchOfflineTeams(leagueId),
        // Note: Regular teams are fetched via useLeagueTeams hook which should auto-refresh
      ]);

      // Refresh player list view so the drafted player disappears from table immediately
      const hasActiveFilters = (search?.trim().length ?? 0) > 0 || (positionFilter && positionFilter !== "ALL");
      if (hasActiveFilters) {
        await fetchFilteredPlayers(filteredPage);
      } else {
        await fetchPlayersPage();
      }

      // Reset inputs
      setSelectedPlayerId(null);
      setSelectedDetails(null);
      setBidAmount("");
      setSelectedTeamId(undefined);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error drafting player");
    } finally {
      setIsSaving(false);
    }
  };

  // Loading/guards
  if (leaguesLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!league) {
    return <div className="p-4 text-red-500">League not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-200"><DollarSign className="h-5 w-5" /> Offline Draft</CardTitle>
          <CardDescription className="text-emerald-300/70">
            Select a player, choose a winning team, enter the winning bid, and save the pick. Budgets and max bids update automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="playerSearch" className="text-emerald-300">Player</Label>
              <Input
                id="playerSearch"
                placeholder="Search players by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-emerald-950/40 text-emerald-100 placeholder:text-gray-500 border-emerald-800/50 focus-visible:ring-emerald-600"
              />
              <div className="flex items-center gap-2">
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-40 bg-emerald-950/40 text-emerald-100 border-emerald-800/50">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent className="bg-emerald-950/95 border border-emerald-800/50 text-emerald-100">
                    <SelectItem value="ALL">All</SelectItem>
                    <SelectItem value="QB">QB</SelectItem>
                    <SelectItem value="RB">RB</SelectItem>
                    <SelectItem value="WR">WR</SelectItem>
                    <SelectItem value="TE">TE</SelectItem>
                    <SelectItem value="K">K</SelectItem>
                    <SelectItem value="DST">DST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(selectedPlayer || selectedDetailsLoading) && (
                <div className="mt-2 p-2 rounded-md border border-emerald-800 bg-emerald-950/50 text-emerald-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-emerald-200">Nominated Player</div>
                    {selectedDetailsLoading ? (
                      <div className="text-sm text-emerald-200 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                    ) : selectedPlayer ? (
                      <div className="text-sm">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                        <span className="text-gray-400"> • {selectedPlayer.position}{selectedPlayer.team ? ` • ${selectedPlayer.team}` : ""}</span>
                      </div>
                    ) : null}
                  </div>
                  <Button variant="outline" size="sm" className="border-emerald-800 text-emerald-200 hover:bg-emerald-900/40" onClick={() => setSelectedPlayerId(null)}>
                    Clear
                  </Button>
                </div>
              )}
              <div className="max-h-56 overflow-auto rounded border border-emerald-800/50 bg-emerald-950/20">
                {playersLoading ? (
                  <div className="p-3 text-sm text-emerald-200 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Searching...
                  </div>
                ) : (availablePlayers?.length ?? 0) === 0 ? (
                  <div className="p-3 text-sm text-gray-400">No results</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-emerald-950/60">
                      <tr>
                        <th className="text-left px-2 py-1 text-emerald-300">Name</th>
                        <th className="text-left px-2 py-1 text-emerald-300">Pos</th>
                        <th className="text-left px-2 py-1 text-emerald-300">Team</th>
                        <th className="px-2 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {availablePlayers.map((p) => (
                        <tr key={p.id} className={`hover:bg-emerald-900/30 ${selectedPlayerId === p.id ? "bg-emerald-900/40" : ""}`}>
                          <td className="px-2 py-1 text-emerald-100">{p.firstName} {p.lastName}</td>
                          <td className="px-2 py-1 text-gray-300">{p.position}</td>
                          <td className="px-2 py-1 text-gray-400">{p.team || ""}</td>
                          <td className="px-2 py-1 text-right">
                            <Button size="sm" variant="outline" className="border-emerald-800 text-emerald-200 hover:bg-emerald-900/40" onClick={() => handleSelectPlayer(p.id)}>
                              {selectedPlayerId === p.id ? "Selected" : "Select"}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-400">
                  Page {visiblePagination.currentPage} of {visiblePagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-emerald-800 text-emerald-200 hover:bg-emerald-900/40" 
                    disabled={!visiblePagination.hasPreviousPage} 
                    onClick={() => {
                      const hasActiveFilters = (search?.trim().length ?? 0) > 0 || (positionFilter && positionFilter !== "ALL");
                      if (hasActiveFilters) {
                        setFilteredPage((p) => Math.max(1, p - 1));
                      } else {
                        setPage((p) => Math.max(1, p - 1));
                      }
                    }}
                  >
                    Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-emerald-800 text-emerald-200 hover:bg-emerald-900/40" 
                    disabled={!visiblePagination.hasNextPage} 
                    onClick={() => {
                      const hasActiveFilters = (search?.trim().length ?? 0) > 0 || (positionFilter && positionFilter !== "ALL");
                      if (hasActiveFilters) {
                        setFilteredPage((p) => p + 1);
                      } else {
                        setPage((p) => p + 1);
                      }
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-emerald-300">Winning Team</Label>
              <Select onValueChange={setSelectedTeamId} value={selectedTeamId}>
                <SelectTrigger className="w-full bg-emerald-950/40 text-emerald-100 border-emerald-800/50">
                  <SelectValue placeholder="Select team" className="text-emerald-100" />
                </SelectTrigger>
                <SelectContent className="bg-emerald-950/95 border border-emerald-800/50 text-emerald-100">
                  {combinedTeams.map((t) => (
                      <SelectItem key={t.id} value={t.id} className="text-emerald-100 focus:bg-emerald-900/40 focus:text-emerald-100">
                        {t.name}
                      </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeamId && (
                <div className="text-xs text-gray-400">
                  Max bid: ${maxBidByTeam[selectedTeamId] ?? 0} • Remaining spots: {remainingSpotsByTeam[selectedTeamId] ?? 0}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Label htmlFor="bidAmount" className="text-emerald-300">Winning Bid</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  placeholder="Enter amount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="bg-emerald-950/40 text-emerald-100 placeholder:text-gray-500 border-emerald-800/50 focus-visible:ring-emerald-600"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleDraft}
                  disabled={isSaving || !selectedPlayerId || !selectedTeamId || !bidAmount}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white"
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Draft Player"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-emerald-300">Round / Pick</Label>
              {(() => {
                const keeperIds = new Set(keepers.map((k) => k.playerId));
                const participantIds = new Set<string>(combinedTeams.map((t) => t.id));
                const picksMade = draftedPlayers.filter((dp) => participantIds.has(dp.teamId) && !keeperIds.has(dp.playerId)).length;
                const numTeams = Math.max(1, participantIds.size);
                const round = Math.floor(picksMade / numTeams) + 1;
                const pickInRound = (picksMade % numTeams) + 1;
                return (
                  <div className="text-lg font-semibold text-emerald-200">
                    Round {round} • Pick {pickInRound}
                  </div>
                );
              })()}
              <div className="mt-2 text-xs text-gray-400">
                Teams: {combinedTeams.length} • Total roster spots: {totalRosterSpots}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-200"><Users className="h-5 w-5" /> Team Budgets</CardTitle>
          <CardDescription className="text-emerald-300/70">Remaining budgets and max bids</CardDescription>
        </CardHeader>
        <CardContent>
          {combinedTeams.length === 0 ? (
            <div className="text-sm text-gray-400">No offline teams. Create teams in the Teams tab.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedParticipants.map((t) => (
                <div
                  key={t.id}
                  className={
                    "rounded-lg p-3 transition-shadow " +
                    (t.id === currentNominatorTeamId
                      ? "border-2 border-yellow-400 bg-yellow-100/10 shadow-yellow-300/40 shadow-lg"
                      : "border border-emerald-900/40 bg-emerald-950/40")
                  }
                >
                  <div className="font-medium text-emerald-200">{t.name}</div>
                  <div className="text-sm text-gray-400">Remaining budget: ${remainingBudgetByTeam[t.id] ?? 0}</div>
                  <div className="text-sm text-gray-400">Remaining spots: {remainingSpotsByTeam[t.id] ?? 0}</div>
                  <div className="text-sm text-emerald-300">Max bid: ${maxBidByTeam[t.id] ?? 0}</div>
                  {t.id === currentNominatorTeamId && (
                    <div className="mt-1 inline-block px-2 py-0.5 rounded bg-yellow-400 text-yellow-900 text-xs font-semibold">Nominating</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


