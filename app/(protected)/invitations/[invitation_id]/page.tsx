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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Trophy,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface InvitationData {
  id: string;
  leagueId: string;
  email: string;
  status: string;
  createdAt: string;
  leagueName: string;
  leagueSize: number;
  inviterFirstName: string | null;
  inviterLastName: string | null;
  inviterEmail: string | null;
}

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const invitationId = params.invitation_id as string;

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canAccept, setCanAccept] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Accept/Decline states
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [actionComplete, setActionComplete] = useState(false);

  useEffect(() => {
    if (userLoading) return;

    const fetchInvitation = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/invitations/${invitationId}`);
        const data = await response.json();

        if (data.success) {
          setInvitation(data.invitation);
          setCanAccept(data.canAccept);
          setStatusMessage(data.message);
        } else {
          setError(data.error || "Failed to fetch invitation");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch invitation"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [invitationId, userLoading]);

  const handleAcceptInvitation = async () => {
    if (!teamName.trim()) {
      setError("Team name is required");
      return;
    }

    setIsAccepting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/leagues/${invitation?.leagueId}/invitations/${invitationId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamName: teamName.trim() }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setActionComplete(true);
        setShowAcceptDialog(false);
        setStatusMessage("Successfully joined the league!");

        // Redirect to league page after a short delay
        setTimeout(() => {
          router.push(`/leagues/${invitation?.leagueId}`);
        }, 2000);
      } else {
        setError(data.error || "Failed to accept invitation");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to accept invitation"
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    setIsDeclining(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/leagues/${invitation?.leagueId}/invitations/${invitationId}/decline`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (data.success) {
        setActionComplete(true);
        setStatusMessage("Invitation declined");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        setError(data.error || "Failed to decline invitation");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to decline invitation"
      );
    } finally {
      setIsDeclining(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading invitation...</div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert>
          <AlertDescription>Invitation not found.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">League Invitation</h1>
          <p className="text-muted-foreground mt-2">
            You've been invited to join a fantasy football league
          </p>
        </div>

        {/* Status Messages */}
        {actionComplete && statusMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {statusMessage}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!canAccept && statusMessage && !actionComplete && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        {/* League Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {invitation.leagueName}
            </CardTitle>
            <CardDescription>
              Invited by{" "}
              {invitation.inviterFirstName && invitation.inviterLastName
                ? `${invitation.inviterFirstName} ${invitation.inviterLastName}`
                : invitation.inviterEmail || "League Commissioner"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  League Size: {invitation.leagueSize} teams
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Invited: {new Date(invitation.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">What happens next?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Choose your team name and join the league</li>
                <li>• Wait for all teams to join</li>
                <li>• Participate in the live auction draft</li>
                <li>• Compete for the championship!</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Current User Info */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.firstName?.charAt(0) || user?.email?.charAt(0) || "U"}
              </div>
              <div>
                <p className="font-medium">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : "Your Account"}
                </p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {canAccept && !actionComplete && (
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAcceptDialog(true)}
              className="flex-1"
              size="lg"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Accept Invitation
            </Button>
            <Button
              variant="outline"
              onClick={handleDeclineInvitation}
              disabled={isDeclining}
              size="lg"
            >
              {isDeclining ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserX className="h-4 w-4 mr-2" />
              )}
              Decline
            </Button>
          </div>
        )}

        {!canAccept && (
          <div className="text-center">
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        )}
      </div>

      {/* Accept Invitation Dialog */}
      <Dialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join {invitation.leagueName}</DialogTitle>
            <DialogDescription>
              Choose a name for your team in this league.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team name"
                disabled={isAccepting}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Choose a unique name that represents your team
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAcceptDialog(false)}
                disabled={isAccepting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAcceptInvitation}
                disabled={isAccepting || !teamName.trim()}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining League...
                  </>
                ) : (
                  <>
                    <Trophy className="mr-2 h-4 w-4" />
                    Join League
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
