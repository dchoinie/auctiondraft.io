import { useLeagueSettings, LeagueSettings } from "@/stores/leagueStore";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import React from "react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, List, Settings, Shield, LogIn } from "lucide-react";
import { useUser } from "@/stores/userStore";
import { useLeagueStore } from "@/stores/leagueStore";

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
  const league = leagues.find((league) => league.id === league_id);

  // Check if user is league admin
  const isAdmin = user?.id === league?.ownerId;

  const draftDateTime = useMemo(() => getDraftDateTime(settings), [settings]);
  const countdown = useCountdown(draftDateTime);

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
      {/* CTA and Tab Links */}
      <div className="flex flex-col items-center gap-8 mt-4">
        <Button
          asChild
          size="lg"
          className="text-2xl px-12 py-6 bg-gradient-to-r from-yellow-500 to-yellow-700 text-yellow-50 font-extrabold shadow-lg border-2 border-yellow-400 hover:from-yellow-600 hover:to-yellow-800 hover:scale-105 transition-transform duration-200"
        >
          <Link href={`/leagues/${league_id}/draft`}>
            <LogIn className="mr-3 w-7 h-7" /> Enter Draft Room
          </Link>
        </Button>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
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
