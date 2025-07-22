import { useLeagueSettings, LeagueSettings } from "@/stores/leagueStore";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo, useState, useEffect } from "react";
import React from "react";

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

export function DraftTab() {
  const { league_id } = useParams();
  const { settings, loading } = useLeagueSettings(league_id as string);
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
      {/* TODO: Add more draft tab content below */}
    </div>
  );
}
