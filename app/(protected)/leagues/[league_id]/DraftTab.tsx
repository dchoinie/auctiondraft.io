import { useLeagueSettings, LeagueSettings } from "@/stores/leagueStore";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, List, Settings, Shield, LogIn, AlertCircle, BarChart3 } from "lucide-react";
import { useUser } from "@/stores/userStore";
import { useLeagueStore } from "@/stores/leagueStore";
import { useLeagueTeams } from "@/stores/teamStore";

function getDraftDateTime(settings: LeagueSettings | null | undefined) {
  if (!settings?.draftDate || !settings?.draftTime) return null;
  // Combine date and time into a single Date object (assume local time)
  return new Date(`${settings.draftDate}T${settings.draftTime}`);
}

function formatDateTime(dt: Date | null) {
  if (!dt) return "-";
  return dt.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function useCountdown(targetDate: Date | null) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!targetDate) return null;
  const diff = targetDate.getTime() - now;
  if (diff <= 0) return "Draft started!";
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

export function DraftTab({
  setActiveTab,
}: {
  setActiveTab?: (tab: string) => void;
}) {
  const { league_id } = useParams();
  const { settings, loading } = useLeagueSettings(league_id as string);
  const { user } = useUser();
  const { leagues } = useLeagueStore();
  const { teams, loading: teamsLoading } = useLeagueTeams(league_id as string);
  const league = leagues.find((league) => league.id === league_id);

  // Check if user is league admin
  const isAdmin = user?.id === league?.ownerId;

  // Check if admin has a team in this league
  const adminHasTeam = teams.some(team => team.ownerId === user?.id);

  const draftDateTime = useMemo(() => getDraftDateTime(settings), [settings]);
  const countdown = useCountdown(draftDateTime);

  // Determine if the Enter Draft Room button should be disabled
  const isDraftButtonDisabled = isAdmin && !adminHasTeam;

  return (
    <div className="flex flex-col gap-8">
      <Card className="mx-auto max-w-xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 shadow-2xl">
        <CardContent className="py-8 flex flex-col items-center gap-2">
          <div className="text-2xl md:text-3xl font-extrabold text-yellow-200 drop-shadow mb-2 tracking-wide uppercase">
            Draft Countdown
          </div>
          <div className="text-4xl md:text-5xl font-bold text-yellow-100 mb-1">
            {loading ? "..." : formatDateTime(draftDateTime)}
          </div>
          <div className="text-lg md:text-2xl font-mono text-yellow-300 mt-2">
            {loading ? "" : draftDateTime ? countdown : "-"}
          </div>
        </CardContent>
      </Card>

      {/* Admin Team Creation Warning */}
      {isDraftButtonDisabled && (
        <Card className="mx-auto max-w-xl border-2 border-red-400 bg-gradient-to-br from-red-900/80 to-red-700/80 shadow-2xl">
          <CardContent className="py-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-red-200">
              <AlertCircle className="h-6 w-6" />
              <span className="text-lg font-semibold">Action Required</span>
            </div>
            <div className="text-center text-red-100">
              <p className="mb-2">You need to create your team before entering the draft room.</p>
              <p className="text-sm text-red-200/80">
                Go to the Teams tab to create your team first.
              </p>
            </div>
            <Button
              onClick={() => setActiveTab && setActiveTab("teams")}
              className="bg-gradient-to-br from-red-800/80 to-red-600/80 border-2 border-red-300 shadow-md hover:shadow-xl text-gray-50 hover:text-gray-300"
            >
              Go to Teams Tab
            </Button>
          </CardContent>
        </Card>
      )}

      {/* CTA and Tab Links */}
      <div className="flex flex-col items-center gap-8 mt-4">
        <Button
          asChild={!isDraftButtonDisabled}
          size="lg"
          disabled={isDraftButtonDisabled}
          className={`text-2xl px-12 py-6 font-extrabold shadow-lg border-2 transition-transform duration-200 ${
            isDraftButtonDisabled
              ? "bg-gradient-to-r from-gray-500 to-gray-700 text-gray-300 border-gray-400 cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-yellow-500 to-yellow-700 text-yellow-50 border-yellow-400 hover:from-yellow-600 hover:to-yellow-800 hover:scale-105"
          }`}
        >
          {isDraftButtonDisabled ? (
            <div className="flex items-center">
              <LogIn className="mr-3 w-7 h-7" /> Enter Draft Room
            </div>
          ) : (
            <Link href={`/leagues/${league_id}/draft`}>
              <LogIn className="mr-3 w-7 h-7" /> Enter Draft Room
            </Link>
          )}
        </Button>
        <div className="flex flex-wrap justify-center gap-4 w-full max-w-4xl">
          <button
            type="button"
            className="group"
            onClick={() => setActiveTab && setActiveTab("teams")}
          >
            <Card className="flex flex-col items-center p-6 green-bg hover:shadow-xl hover:scale-105 transition-transform cursor-pointer">
              <CardHeader className="flex flex-col items-center gap-2 pb-2">
                <Users className="w-8 h-8 text-emerald-200 group-hover:text-emerald-100" />
                <CardTitle className="text-lg text-emerald-100 group-hover:text-emerald-50">
                  Teams
                </CardTitle>
              </CardHeader>
            </Card>
          </button>
          <button
            type="button"
            className="group"
            onClick={() => setActiveTab && setActiveTab("rosters")}
          >
            <Card className="flex flex-col items-center p-6 blue-bg hover:shadow-xl hover:scale-105 transition-transform cursor-pointer">
              <CardHeader className="flex flex-col items-center gap-2 pb-2">
                <List className="w-8 h-8 text-blue-200 group-hover:text-blue-100" />
                <CardTitle className="text-lg text-blue-100 group-hover:text-blue-50">
                  Rosters
                </CardTitle>
              </CardHeader>
            </Card>
          </button>
          <button
            type="button"
            className="group"
            onClick={() => setActiveTab && setActiveTab("analytics")}
          >
            <Card className="flex flex-col items-center p-6 purple-bg hover:shadow-xl hover:scale-105 transition-transform cursor-pointer">
              <CardHeader className="flex flex-col items-center gap-2 pb-2">
                <BarChart3 className="w-8 h-8 text-purple-200 group-hover:text-purple-100" />
                <CardTitle className="text-lg text-purple-100 group-hover:text-purple-50">
                  Analytics
                </CardTitle>
              </CardHeader>
            </Card>
          </button>
          {isAdmin && (
            <button
              type="button"
              className="group"
              onClick={() => setActiveTab && setActiveTab("settings")}
            >
              <Card className="flex flex-col items-center p-6 gray-bg hover:shadow-xl hover:scale-105 transition-transform cursor-pointer">
                <CardHeader className="flex flex-col items-center gap-2 pb-2">
                  <Settings className="w-8 h-8 text-gray-200 group-hover:text-gray-100" />
                  <CardTitle className="text-lg text-gray-100 group-hover:text-gray-50">
                    Settings
                  </CardTitle>
                </CardHeader>
              </Card>
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className="group"
              onClick={() => setActiveTab && setActiveTab("keepers")}
            >
              <Card className="flex flex-col items-center p-6 yellow-bg hover:shadow-xl hover:scale-105 transition-transform cursor-pointer">
                <CardHeader className="flex flex-col items-center gap-2 pb-2">
                  <Shield className="w-8 h-8 text-yellow-200 group-hover:text-yellow-100" />
                  <CardTitle className="text-lg text-yellow-100 group-hover:text-yellow-50">
                    Keepers
                  </CardTitle>
                </CardHeader>
              </Card>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
