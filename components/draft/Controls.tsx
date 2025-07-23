import React, { useState } from "react";
import { useLeagueAdmin } from "@/stores/leagueStore";

interface ControlsProps {
  leagueId: string;
  sendAdminAction: (action: string, payload?: Record<string, unknown>) => void;
}

export default function Controls({ leagueId, sendAdminAction }: ControlsProps) {
  const { isAdmin, loading } = useLeagueAdmin(leagueId);
  const [draftState, setDraftState] = useState<
    "not_started" | "running" | "paused"
  >("not_started");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to wrap sendAdminAction with loading/error UI
  const handleAdminAction = (
    action: string,
    payload: Record<string, unknown> = {}
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      sendAdminAction(action, payload);
    } catch (e) {
      setError("Failed to send action");
    } finally {
      setTimeout(() => setActionLoading(false), 500); // Simulate quick feedback
    }
  };

  //   if (loading) return null;
  //   if (!isAdmin) return null;

  return (
    <div className="mb-4 p-4 bg-emerald-950/80 border-b border-emerald-700 rounded shadow flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        {/* Start/Resume/Pause Draft */}
        {draftState === "not_started" && (
          <button
            className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800"
            disabled={actionLoading}
            onClick={() => {
              handleAdminAction("start-draft");
              setDraftState("running");
            }}
          >
            Start Draft
          </button>
        )}
        {draftState === "running" && (
          <button
            className="px-4 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800"
            disabled={actionLoading}
            onClick={() => {
              handleAdminAction("pause-draft");
              setDraftState("paused");
            }}
          >
            Pause Draft
          </button>
        )}
        {draftState === "paused" && (
          <button
            className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800"
            disabled={actionLoading}
            onClick={() => {
              handleAdminAction("resume-draft");
              setDraftState("running");
            }}
          >
            Resume Draft
          </button>
        )}
        {/* Reset Nomination */}
        <button
          className="px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800"
          disabled={actionLoading}
          onClick={() => handleAdminAction("reset-nomination")}
        >
          Reset Nomination
        </button>
        {/* Undo Last Bid/Pick */}
        <button
          className="px-4 py-2 bg-orange-700 text-white rounded hover:bg-orange-800"
          disabled={actionLoading}
          onClick={() => handleAdminAction("undo-last-bid")}
        >
          Undo Last Bid/Pick
        </button>
        {/* Force Assign Player */}
        <button
          className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
          disabled={actionLoading}
          onClick={() => handleAdminAction("force-assign-player")}
        >
          Force Assign Player
        </button>
      </div>
      {error && <div className="text-red-400 mt-2">{error}</div>}
    </div>
  );
}
