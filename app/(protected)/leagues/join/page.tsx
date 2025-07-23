"use client";

import React, { useState } from "react";
import PageTitle from "@/components/PageTitle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueStore } from "@/stores/leagueStore";
import { Info } from "lucide-react";

export default function JoinLeaguePage() {
  const [leagueId, setLeagueId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [leagueInfo, setLeagueInfo] = useState<{
    leagueName: string;
    adminName: string | null;
  } | null>(null);
  const [teamName, setTeamName] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useUser();

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLeagueInfo(null);
    setModalOpen(false);
    setTeamName("");
    try {
      const res = await fetch("/api/leagues/join/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leagueId: leagueId.trim(),
          joinCode: joinCode.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLeagueInfo({
          leagueName: data.leagueName,
          adminName: data.adminName,
        });
        setModalOpen(true);
      } else {
        setError(data.error || "Unable to validate league");
      }
    } catch (err) {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setJoinLoading(true);
    setJoinError(null);
    try {
      if (!user?.id) {
        setJoinError("You must be logged in to join a league.");
        setJoinLoading(false);
        return;
      }
      if (!teamName.trim()) {
        setJoinError("Team name is required.");
        setJoinLoading(false);
        return;
      }
      // Call the teams API to create the team
      const res = await fetch(`/api/leagues/${leagueId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim(), ownerId: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        // Refetch leagues so sidebar and UI update
        useLeagueStore.getState().refetch();
        // Redirect to the league page
        router.push(`/leagues/${leagueId}`);
      } else {
        setJoinError(data.error || "Failed to join league");
      }
    } catch (err) {
      setJoinError("Failed to join league");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageTitle
        title="Join an existing league"
        subtitle="Enter the league ID and join code to join an existing league"
      >
        <div className="mb-4">
          <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200 rounded-lg p-4">
            <Info className="text-emerald-700" size={22} />
            <div>
              <p className="text-emerald-900 font-medium">
                If you do not have a league ID, please contact your league
                admin.
              </p>
            </div>
          </div>
        </div>
      </PageTitle>
      <form
        className="space-y-4 mt-6 bg-gradient-to-br from-emerald-900/90 to-gray-900/90 border-2 border-emerald-800 text-emerald-100 p-6 rounded-lg"
        onSubmit={handleValidate}
      >
        <div>
          <label
            htmlFor="league-id"
            className="block font-medium mb-1 text-emerald-300"
          >
            League ID
          </label>
          <Input
            className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
            id="league-id"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            placeholder="Enter League ID"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label
            htmlFor="join-code"
            className="block font-medium mb-1 text-emerald-300"
          >
            Join Code
          </label>
          <Input
            className="bg-gray-900/80 border-gray-700 text-emerald-100 placeholder:text-emerald-200/50"
            id="join-code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter Join Code"
            required
            disabled={loading}
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          className="w-full bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl"
          disabled={loading}
        >
          {loading ? "Validating..." : "Validate"}
        </Button>
      </form>

      {/* Modal for league info, team name, and join confirmation */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join League</DialogTitle>
            <DialogDescription>
              Enter your team name to join the league.
            </DialogDescription>
          </DialogHeader>
          {leagueInfo && (
            <div className="my-4 space-y-2">
              <div>
                <span className="font-semibold">League Name:</span>{" "}
                {leagueInfo.leagueName}
              </div>
              <div>
                <span className="font-semibold">League Admin:</span>{" "}
                {leagueInfo.adminName || "Unknown"}
              </div>
            </div>
          )}
          <div className="my-4">
            <label htmlFor="team-name" className="block font-medium mb-1">
              Team Name
            </label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter your team name"
              disabled={joinLoading}
              maxLength={50}
            />
          </div>
          {joinError && (
            <Alert variant="destructive">
              <AlertDescription>{joinError}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={joinLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleJoin}
              disabled={joinLoading || !teamName.trim()}
            >
              {joinLoading ? "Joining..." : "Join League"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
