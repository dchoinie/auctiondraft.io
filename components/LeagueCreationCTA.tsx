"use client";

import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useLeagueMembership } from "@/hooks/use-league-membership";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Trophy, CreditCard, Plus } from "lucide-react";

export function LeagueCreationCTA() {
  const {
    user,
    loading: userLoading,
    hasCredits,
    refetch: refetchUser,
  } = useCurrentUser();
  const { refetch: refetchLeagues } = useLeagueMembership();

  const [showLeagueCreation, setShowLeagueCreation] = useState(false);
  const [leagueName, setLeagueName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isInitiatingPayment, setIsInitiatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiatePayment = async () => {
    try {
      setIsInitiatingPayment(true);
      setError(null);

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditPackage: "basic",
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initiate payment"
      );
    } finally {
      setIsInitiatingPayment(false);
    }
  };

  const handleCreateLeague = async () => {
    if (!leagueName.trim()) {
      setError("League name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/leagues/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: leagueName.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowLeagueCreation(false);
        setLeagueName("");
        refetchLeagues();
        refetchUser(); // Refresh user data to update credits
      } else {
        setError(data.error || "Failed to create league");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartProcess = () => {
    if (!hasCredits) {
      initiatePayment();
    } else {
      setShowLeagueCreation(true);
    }
  };

  if (userLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading...</span>
        </CardContent>
      </Card>
    );
  }

  const needsSetup = !hasCredits;
  const credits = user?.leagueCredits || 0;

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Create Your First League</CardTitle>
          <CardDescription>
            {needsSetup
              ? "Purchase league credits to get started"
              : `You have ${credits} league credit${
                  credits !== 1 ? "s" : ""
                } available`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                1
              </div>
              <span className="text-sm">
                {needsSetup
                  ? "Purchase league credits ($9.99)"
                  : "✓ Credits available"}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm">
                2
              </div>
              <span className="text-sm text-muted-foreground">
                Create your league
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm">
                3
              </div>
              <span className="text-sm text-muted-foreground">
                Invite friends to join
              </span>
            </div>
          </div>

          <Button
            onClick={handleStartProcess}
            className="w-full"
            disabled={isInitiatingPayment || isCreating}
          >
            {isInitiatingPayment ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : needsSetup ? (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Purchase Credits
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create League
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showLeagueCreation} onOpenChange={setShowLeagueCreation}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Your League</DialogTitle>
            <DialogDescription>
              Give your league a name to get started. You can always change it
              later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="leagueName">League Name</Label>
              <Input
                id="leagueName"
                value={leagueName}
                onChange={(e) => setLeagueName(e.target.value)}
                placeholder="Enter your league name"
                disabled={isCreating}
                maxLength={50}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowLeagueCreation(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateLeague}
                disabled={isCreating || !leagueName.trim()}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create League"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
