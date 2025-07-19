"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, DollarSign, UserCheck, UserX } from "lucide-react";

interface Team {
  id: string;
  name: string;
  ownerId: string;
  draftOrder: number;
  remainingBudget: number;
  remainingRosterSlots: number;
  totalRosterSlots: number;
  roster: number;
}

interface Participant {
  userId: string;
  teamId: string;
  teamName: string;
  isActive: boolean;
}

interface DraftTrackerProps {
  teams: Team[];
  currentTurnTeamId?: string;
  participants: Participant[];
}

export function DraftTracker({
  teams,
  currentTurnTeamId,
  participants,
}: DraftTrackerProps) {
  const sortedTeams = [...teams].sort(
    (a, b) => (a.draftOrder || 0) - (b.draftOrder || 0)
  );

  const getTeamParticipant = (teamId: string) => {
    return participants.find((p) => p.teamId === teamId);
  };

  const isTeamOnline = (teamId: string) => {
    const participant = getTeamParticipant(teamId);
    return participant?.isActive || false;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Draft Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedTeams.map((team) => (
            <div
              key={team.id}
              className={`p-3 rounded-lg border transition-all ${
                team.id === currentTurnTeamId
                  ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {team.draftOrder || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-sm">{team.name}</p>
                      <div className="flex items-center gap-1">
                        {isTeamOnline(team.id) ? (
                          <UserCheck className="h-3 w-3 text-green-500" />
                        ) : (
                          <UserX className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {isTeamOnline(team.id) ? "Online" : "Offline"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {team.id === currentTurnTeamId && (
                  <Badge variant="default" className="text-xs">
                    On the Clock
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-semibold">${team.remainingBudget}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-500" />
                  <span className="text-muted-foreground">Slots:</span>
                  <span className="font-semibold">
                    {team.remainingRosterSlots}/{team.totalRosterSlots}
                  </span>
                </div>
              </div>

              <div className="mt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Roster Progress</span>
                  <span className="font-semibold">
                    {team.roster}/{team.totalRosterSlots}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(team.roster / team.totalRosterSlots) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
