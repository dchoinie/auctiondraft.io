"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Users, Calendar, Trophy } from "lucide-react";

interface League {
  id: string;
  name: string;
  ownerId: string;
  isDraftStarted: number;
  leagueSize: number;
  draftDate: string | null;
  draftTime: string | null;
  draftLocation: string | null;
}

export default function LeaguePage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const leagueId = params.league_id as string;

  const [league, setLeague] = useState<League | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch league data
  useEffect(() => {
    const fetchLeague = async () => {
      try {
        const response = await fetch(`/api/leagues/${leagueId}/settings`);
        if (!response.ok) {
          throw new Error("Failed to fetch league data");
        }
        const data = await response.json();
        setLeague(data.league);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load league");
      } finally {
        setLoading(false);
      }
    };

    if (leagueId) {
      fetchLeague();
    }
  }, [leagueId]);

  const isOwner = user?.id === league?.ownerId;

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">
            {error || "League not found"}
          </h1>
          <Button onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{league.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isOwner ? "default" : "secondary"}>
                {isOwner ? "Owner" : "Member"}
              </Badge>
              <Badge variant={league.isDraftStarted ? "default" : "outline"}>
                {league.isDraftStarted ? "Draft Started" : "Draft Pending"}
              </Badge>
            </div>
          </div>
        </div>

        {isOwner && (
          <Button
            onClick={() => router.push(`/leagues/${leagueId}/settings`)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            League Settings
          </Button>
        )}
      </div>

      {/* League Info Cards */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              League Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">League Size:</span>
              <span>{league.leagueSize} teams</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span>
                {league.isDraftStarted ? "Draft Started" : "Pre-Draft"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Draft Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Draft Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span>{league.draftDate || "Not scheduled"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span>{league.draftTime || "Not scheduled"}</span>
            </div>
            {league.draftLocation && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="text-right">{league.draftLocation}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Manage your league and team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Button variant="outline" className="justify-start">
              View Teams
            </Button>
            <Button variant="outline" className="justify-start">
              Player Pool
            </Button>
            <Button variant="outline" className="justify-start">
              Draft Room
            </Button>
            <Button variant="outline" className="justify-start">
              League Chat
            </Button>
            <Button variant="outline" className="justify-start">
              Transactions
            </Button>
            <Button variant="outline" className="justify-start">
              Standings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
