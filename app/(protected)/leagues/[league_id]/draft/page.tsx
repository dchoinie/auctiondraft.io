/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@/stores/userStore";
import PartySocket from "partysocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DraftTracker } from "@/components/draft/DraftTracker";
import { AvailablePlayersTable } from "@/components/draft/AvailablePlayersTable";
import { NominationInterface } from "@/components/draft/NominationInterface";
import { BiddingInterface } from "@/components/draft/BiddingInterface";
import { CountdownComponent } from "@/components/draft/CountdownComponent";
import { BidHistory } from "@/components/draft/BidHistory";
import { Loader2, Users, Trophy, Clock, User } from "lucide-react";

// Draft message types (copied from party to avoid import issues)
enum DraftMessageType {
  JOIN_ROOM = "JOIN_ROOM",
  LEAVE_ROOM = "LEAVE_ROOM",
  USER_JOINED = "USER_JOINED",
  USER_LEFT = "USER_LEFT",
  DRAFT_STATE_UPDATE = "DRAFT_STATE_UPDATE",
  DRAFT_STARTED = "DRAFT_STARTED",
  DRAFT_ENDED = "DRAFT_ENDED",
  START_DRAFT = "START_DRAFT",
  NOMINATE_PLAYER = "NOMINATE_PLAYER",
  PLAYER_NOMINATED = "PLAYER_NOMINATED",
  PLACE_BID = "PLACE_BID",
  BID_PLACED = "BID_PLACED",
  START_COUNTDOWN = "START_COUNTDOWN",
  COUNTDOWN_UPDATE = "COUNTDOWN_UPDATE",
  COUNTDOWN_ENDED = "COUNTDOWN_ENDED",
  PLAYER_ACQUIRED = "PLAYER_ACQUIRED",
  SAVING_PLAYER = "SAVING_PLAYER",
  TURN_CHANGE = "TURN_CHANGE",
  BUDGET_UPDATED = "BUDGET_UPDATED",
  ERROR = "ERROR",
  TEST_MODE_TOGGLE = "TEST_MODE_TOGGLE",
}

interface DraftState {
  league: {
    id: string;
    name: string;
    ownerId: string;
    qbSlots: number;
    rbSlots: number;
    wrSlots: number;
    teSlots: number;
    flexSlots: number;
    dstSlots: number;
    kSlots: number;
    benchSlots: number;
  };
  draftState: {
    leagueId: string;
    currentNominationId: string | null;
    currentTurnTeamId: string | null;
    phase: string;
  } | null;
  teams: Array<{
    id: string;
    name: string;
    ownerId: string;
    draftOrder: number;
    remainingBudget: number;
    remainingRosterSlots: number;
    totalRosterSlots: number;
    roster: number;
  }>;
  currentNomination: {
    id: string;
    playerId: string;
    playerName: string;
    currentBid: number;
    highestBidderId: string;
    nominatingTeamId: string;
    startedAt: number;
  } | null;
  availablePlayers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    position: string;
    team: string;
    searchRank: number;
  }>;
  userTeam: {
    id: string;
    name: string;
    ownerId: string;
    remainingBudget: number;
  };
}

interface DraftMessage {
  type: DraftMessageType;
  data?: Record<string, unknown>;
  timestamp: number;
}

export default function DraftRoomPage() {
  const params = useParams();
  const { user, isAdmin } = useUser();
  const leagueId = params.league_id as string;

  // State management
  const [draftState, setDraftState] = useState<DraftState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<PartySocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState("nominating");
  const [leagueSettings, setLeagueSettings] = useState<{
    timerEnabled: boolean;
    timerDuration: number;
  } | null>(null);
  const [bids, setBids] = useState<
    Array<{
      id: string;
      teamId: string;
      amount: number;
      timestamp: number;
    }>
  >([]);
  const [countdown, setCountdown] = useState<{
    active: boolean;
    endTime: number;
    duration: number;
  } | null>(null);
  const [participants, setParticipants] = useState<
    Array<{
      userId: string;
      teamId: string;
      teamName: string;
      isActive: boolean;
    }>
  >([]);

  // Initialize connection and load draft state
  useEffect(() => {
    if (!user?.id || !leagueId) return;

    loadDraftState();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [user?.id, leagueId]);

  // Connect to PartyKit after draft state is loaded
  useEffect(() => {
    if (!user?.id || !draftState?.userTeam) return;

    connectToPartyKit();
  }, [user?.id, draftState?.userTeam]);

  const loadDraftState = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/leagues/${leagueId}/draft`);
      const data = await response.json();

      if (data.success) {
        setDraftState(data.data);
      } else {
        setError(data.error || "Failed to load draft state");
      }
    } catch (err) {
      setError("Failed to load draft state");
    } finally {
      setLoading(false);
    }
  };

  const connectToPartyKit = () => {
    if (!user?.id || !draftState?.userTeam) return;

    const partySocket = new PartySocket({
      host: "localhost:1999",
      room: leagueId,
      party: "draft",
    });

    partySocket.addEventListener("open", () => {
      console.log("✅ Connected to PartyKit");
      setConnected(true);

      // Join the room
      partySocket.send(
        JSON.stringify({
          type: DraftMessageType.JOIN_ROOM,
          data: {
            userId: user.id,
            teamId: draftState.userTeam.id,
            teamName: draftState.userTeam.name,
          },
          timestamp: Date.now(),
        })
      );

      // Start the draft if it's not already started
      // Find the first team in draft order
      const firstTeam = draftState.teams
        .filter((team) => team.draftOrder !== null)
        .sort((a, b) => (a.draftOrder || 0) - (b.draftOrder || 0))[0];

      if (firstTeam) {
        console.log("🚀 Starting draft with first team:", firstTeam.name);
        partySocket.send(
          JSON.stringify({
            type: DraftMessageType.START_DRAFT,
            data: {
              firstTeamId: firstTeam.id,
            },
            timestamp: Date.now(),
          })
        );
      }
    });

    partySocket.addEventListener("message", (event) => {
      console.log("📨 Received message from PartyKit:", event.data);
      const message: DraftMessage = JSON.parse(event.data);
      handleRealtimeMessage(message);
    });

    partySocket.addEventListener("close", () => {
      console.log("❌ Disconnected from PartyKit");
      setConnected(false);
    });

    partySocket.addEventListener("error", (error) => {
      console.error("❌ PartyKit error:", error);
      setConnected(false);
    });

    setSocket(partySocket);
  };

  const handleRealtimeMessage = (message: DraftMessage) => {
    if (!message.data) return;

    switch (message.type) {
      case DraftMessageType.DRAFT_STATE_UPDATE:
        setParticipants((message.data.participants as any[]) || []);
        setBids((message.data.bids as any[]) || []);
        setCountdown(message.data.countdown as any);
        if (typeof message.data.saving === "boolean")
          setSaving(message.data.saving);
        if (typeof message.data.phase === "string")
          setPhase(message.data.phase);
        if (message.data.currentTurnTeamId) {
          setDraftState((prev) =>
            prev
              ? {
                  ...prev,
                  draftState: {
                    ...prev.draftState!,
                    currentTurnTeamId: message.data?.currentTurnTeamId as
                      | string
                      | null,
                  },
                }
              : null
          );
        }
        if (message.data.leagueSettings) {
          setLeagueSettings(
            message.data.leagueSettings as {
              timerEnabled: boolean;
              timerDuration: number;
            }
          );
        }
        break;

      case DraftMessageType.USER_JOINED:
        setParticipants((prev) => [...prev, message.data as any]);
        break;

      case DraftMessageType.USER_LEFT:
        setParticipants((prev) =>
          prev.filter((p) => p.userId !== (message.data as any).userId)
        );
        break;

      case DraftMessageType.DRAFT_STARTED:
        // Update draft state with the first team's turn
        setDraftState((prev) =>
          prev
            ? {
                ...prev,
                draftState: {
                  ...prev.draftState!,
                  currentTurnTeamId: (message.data as any).firstTeamId,
                  phase: (message.data as any).phase || "nominating",
                },
              }
            : null
        );
        setPhase((message.data as any).phase || "nominating");
        break;

      case DraftMessageType.PLAYER_NOMINATED:
        setDraftState((prev) =>
          prev
            ? {
                ...prev,
                currentNomination: (message.data as any).nomination,
                draftState: { ...prev.draftState!, phase: "bidding" },
              }
            : null
        );
        setBids((message.data as any).bids || []);
        setPhase((message.data as any).phase || "bidding");
        break;

      case DraftMessageType.BID_PLACED:
        setDraftState((prev) =>
          prev
            ? {
                ...prev,
                currentNomination: (message.data as any).nomination,
              }
            : null
        );
        setBids((message.data as any).bids || []);
        // Clear countdown when new bid is placed
        setCountdown(null);
        break;

      case DraftMessageType.START_COUNTDOWN:
        setCountdown({
          active: true,
          endTime: (message.data as any).endTime,
          duration: (message.data as any).duration,
        });
        break;

      case DraftMessageType.COUNTDOWN_ENDED:
        setCountdown(null);
        break;

      case DraftMessageType.SAVING_PLAYER:
        setSaving(true);
        setPhase("saving");
        break;

      case DraftMessageType.PLAYER_ACQUIRED:
        const { playerId } = message.data as any;

        // Remove acquired player from available players immediately
        setDraftState((prev) => {
          if (!prev) return null;

          const updatedAvailablePlayers = prev.availablePlayers.filter(
            (player) => player.id !== playerId
          );

          return {
            ...prev,
            availablePlayers: updatedAvailablePlayers,
            currentNomination: null,
          };
        });

        // Clear auction state
        setBids([]);
        setCountdown(null);
        setSaving(false);
        setPhase("nominating");

        // Refresh full state in background for accuracy
        setTimeout(() => loadDraftState(), 1000);
        break;

      case DraftMessageType.TURN_CHANGE:
        setDraftState((prev) =>
          prev
            ? {
                ...prev,
                draftState: {
                  ...prev.draftState!,
                  currentTurnTeamId: (message.data as any).newTurnTeamId,
                  phase: (message.data as any).phase || "nominating",
                },
              }
            : null
        );
        if ((message.data as any).phase) {
          setPhase((message.data as any).phase);
        }
        break;

      case DraftMessageType.BUDGET_UPDATED:
        const { teamBudgets } = message.data as any;
        setDraftState((prev) => {
          if (!prev) return null;

          const updatedTeams = prev.teams.map((team) => {
            const budgetUpdate = teamBudgets.find(
              (b: any) => b.teamId === team.id
            );
            if (budgetUpdate) {
              return {
                ...team,
                remainingBudget: budgetUpdate.remainingBudget,
                remainingRosterSlots: budgetUpdate.remainingRosterSlots,
              };
            }
            return team;
          });

          return {
            ...prev,
            teams: updatedTeams,
          };
        });
        break;

      case DraftMessageType.ERROR:
        setError((message.data as any).error);
        break;

      case DraftMessageType.TEST_MODE_TOGGLE:
        setTestMode((message.data as any).enabled);
        break;

      default:
        console.log("Unknown message type:", message.type);
    }
  };

  const handleNomination = async (
    playerId: string,
    playerName: string,
    amount: number
  ) => {
    if (!socket || !draftState?.userTeam || !user?.id) {
      console.error("❌ Nomination failed - missing required data:", {
        socket: !!socket,
        userTeam: !!draftState?.userTeam,
        userId: !!user?.id,
      });
      return;
    }

    // Check if socket is actually connected
    if (socket.readyState !== WebSocket.OPEN) {
      console.error("❌ Nomination failed - socket not connected:", {
        readyState: socket.readyState,
        connected: connected,
      });
      setError("Not connected to draft server");
      return;
    }

    try {
      console.log("🏈 Sending nomination:", {
        playerId,
        playerName,
        amount,
        teamId: draftState.userTeam.id,
        userId: user.id,
        socketReadyState: socket.readyState,
      });

      const nominationMessage = {
        type: DraftMessageType.NOMINATE_PLAYER,
        data: {
          playerId,
          playerName,
          nominationAmount: amount,
          teamId: draftState.userTeam.id,
          userId: user.id,
        },
        timestamp: Date.now(),
      };

      console.log(
        "📤 Raw nomination message:",
        JSON.stringify(nominationMessage, null, 2)
      );

      // Send nomination directly to PartyKit
      socket.send(JSON.stringify(nominationMessage));

      console.log("✅ Nomination message sent successfully");
    } catch (err) {
      console.error("❌ Failed to nominate player:", err);
      setError("Failed to nominate player");
    }
  };

  const handleBid = async (amount: number) => {
    if (!socket || !draftState?.userTeam || !user?.id) return;

    try {
      // Send bid directly to PartyKit
      socket.send(
        JSON.stringify({
          type: DraftMessageType.PLACE_BID,
          data: {
            teamId: draftState.userTeam.id,
            amount,
            userId: user.id,
          },
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      setError("Failed to place bid");
    }
  };

  const handleStartCountdown = () => {
    if (!socket) return;

    socket.send(
      JSON.stringify({
        type: DraftMessageType.START_COUNTDOWN,
        data: { duration: 10000 }, // 10 seconds
        timestamp: Date.now(),
      })
    );
  };

  const handleCountdownEnd = async () => {
    // Countdown ending and player acquisition is now handled automatically by PartyKit server
    // No action needed from frontend
  };

  const handleTestModeToggle = async () => {
    if (!socket) return;

    // Toggle test mode locally
    setTestMode(!testMode);

    // Send test mode toggle to PartyKit
    socket.send(
      JSON.stringify({
        type: DraftMessageType.TEST_MODE_TOGGLE,
        data: {
          enabled: !testMode,
        },
        timestamp: Date.now(),
      })
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin mr-2" />
        <span>Loading draft room...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!draftState) {
    return (
      <div className="container mx-auto p-4">
        <Alert>
          <AlertDescription>Draft room not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get current turn team ID from PartyKit state (not from API)
  const currentTurnTeamId = draftState.draftState?.currentTurnTeamId || null;

  const isUserTurn = currentTurnTeamId === draftState.userTeam?.id;
  const canBid =
    phase === "bidding" &&
    draftState.currentNomination &&
    draftState.currentNomination.highestBidderId !== draftState.userTeam?.id &&
    !saving;
  const canNominate = isUserTurn && phase === "nominating" && !saving;

  // Debug logging
  console.log("🔍 Draft Debug Info:", {
    currentTurnTeamId,
    userTeamId: draftState.userTeam?.id,
    isUserTurn,
    phase,
    saving,
    canNominate,
    currentNomination: draftState.currentNomination,
  });

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {draftState.league.name} - Draft Room
          </h1>
          <p className="text-muted-foreground mt-1">Live Auction Draft</p>
        </div>
        <div className="flex items-center space-x-4">
          {isAdmin && (
            <Button
              variant={testMode ? "destructive" : "outline"}
              onClick={handleTestModeToggle}
              size="sm"
            >
              {testMode ? "Test Mode: ON" : "Test Mode: OFF"}
            </Button>
          )}
          {isAdmin && !currentTurnTeamId && (
            <Button
              variant="outline"
              onClick={() => {
                if (socket && draftState.teams.length > 0) {
                  const firstTeam = draftState.teams
                    .filter((team) => team.draftOrder !== null)
                    .sort(
                      (a, b) => (a.draftOrder || 0) - (b.draftOrder || 0)
                    )[0];

                  if (firstTeam) {
                    socket.send(
                      JSON.stringify({
                        type: DraftMessageType.START_DRAFT,
                        data: {
                          firstTeamId: firstTeam.id,
                        },
                        timestamp: Date.now(),
                      })
                    );
                  }
                }
              }}
              size="sm"
            >
              Start Draft
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => {
                if (socket) {
                  console.log("🧪 Testing connection...");
                  socket.send(
                    JSON.stringify({
                      type: DraftMessageType.TEST_MODE_TOGGLE,
                      data: { enabled: !testMode },
                      timestamp: Date.now(),
                    })
                  );
                }
              }}
              size="sm"
            >
              Test Connection
            </Button>
          )}
          <Badge variant={connected ? "default" : "destructive"}>
            {connected ? "Connected" : "Disconnected"}
          </Badge>
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">{participants.length} online</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Your Turn Alert */}
      {canNominate && (
        <Alert className="border-primary bg-primary/10">
          <User className="h-4 w-4" />
          <AlertDescription className="font-semibold">
            It&apos;s your turn to nominate a player! Select a player from the
            nomination interface below.
          </AlertDescription>
        </Alert>
      )}

      {/* Saving Alert */}
      {saving && (
        <Alert className="border-amber-500 bg-amber-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription className="font-semibold">
            Saving draft results... Please wait.
          </AlertDescription>
        </Alert>
      )}

      {/* Draft Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Draft Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Phase</p>
              <p className="font-semibold capitalize">{phase}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Turn</p>
              <p className="font-semibold">
                {draftState.teams.find(
                  (t) => t.id === draftState.draftState?.currentTurnTeamId
                )?.name || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Turn</p>
              <Badge variant={isUserTurn ? "default" : "secondary"}>
                {isUserTurn ? "Your Turn" : "Waiting"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Timer Settings</p>
              <p className="font-semibold">
                {leagueSettings?.timerEnabled
                  ? `${leagueSettings.timerDuration}s enabled`
                  : "Disabled"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Draft Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Draft Tracker */}
        <div className="lg:col-span-1">
          <DraftTracker
            teams={draftState.teams}
            currentTurnTeamId={
              draftState.draftState?.currentTurnTeamId ?? undefined
            }
            participants={participants}
          />
        </div>

        {/* Right Column - Players and Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Nomination */}
          {draftState.currentNomination && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Current Nomination
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">
                        {draftState.currentNomination.playerName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Nominated by{" "}
                        {
                          draftState.teams.find(
                            (t) =>
                              t.id ===
                              draftState.currentNomination?.nominatingTeamId
                          )?.name
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        ${draftState.currentNomination.currentBid}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        High bidder:{" "}
                        {
                          draftState.teams.find(
                            (t) =>
                              t.id ===
                              draftState.currentNomination?.highestBidderId
                          )?.name
                        }
                      </p>
                    </div>
                  </div>

                  {/* Countdown Component */}
                  {countdown && (
                    <CountdownComponent
                      countdown={countdown}
                      onCountdownEnd={handleCountdownEnd}
                    />
                  )}

                  {/* Bidding Interface */}
                  {canBid && (
                    <BiddingInterface
                      currentBid={draftState.currentNomination.currentBid}
                      onBid={handleBid}
                      onStartCountdown={handleStartCountdown}
                      disabled={saving}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nomination Interface */}
          {canNominate && (
            <NominationInterface
              onNominate={handleNomination}
              userTeam={draftState.userTeam}
              availablePlayers={draftState.availablePlayers}
              disabled={saving}
            />
          )}

          {/* Bid History */}
          {bids.length > 0 && (
            <BidHistory bids={bids} teams={draftState.teams} />
          )}

          {/* Available Players */}
          <AvailablePlayersTable
            players={draftState.availablePlayers}
            onSelectPlayer={(player) => {
              // This will be handled by the nomination interface
            }}
          />
        </div>
      </div>
    </div>
  );
}
