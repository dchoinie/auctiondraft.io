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
    <div className="max-w-md">
      <PageTitle title="Join an existing league" />
      <form className="space-y-4 mt-6" onSubmit={handleValidate}>
        <div>
          <label
            htmlFor="league-id"
            className="block font-medium mb-1 text-gray-50"
          >
            League ID
          </label>
          <Input
            className="bg-gray-50"
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
            className="block font-medium mb-1 text-gray-50"
          >
            Join Code
          </label>
          <Input
            className="bg-gray-50"
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
        <Button type="submit" className="w-full" disabled={loading}>
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
