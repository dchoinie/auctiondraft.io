"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@/stores/userStore";
import { useLeagueMembership } from "@/stores/leagueStore";
import { ProfileCompletionModal } from "@/components/ProfileCompletionModal";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageTitle from "@/components/PageTitle";
import { CheckCircle } from "lucide-react";

export default function Dashboard() {
  const {
    user,
    loading: userLoading,
    error: userError,
    needsProfileCompletion,
    updateProfile,
    refetch: refetchUser,
  } = useUser();
  const {
    hasLeagues,
    leagues,
    loading: leagueLoading,
    error: leagueError,
  } = useLeagueMembership();
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");

  // Handle payment success redirect
  useEffect(() => {
    if (paymentStatus === "success") {
      console.log("Payment successful, refreshing user data...");
      refetchUser();
      // Clear the URL parameter after a short delay
      setTimeout(() => {
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }, 3000);
    }
  }, [paymentStatus, refetchUser]); // refetchUser is now stable via useCallback

  // Show loading state while checking user data and league membership
  if (userLoading || leagueLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-emerald-900 to-gray-900">
        <div className="text-lg text-gray-50">Loading...</div>
      </div>
    );
  }

  // Show error state if there's an error
  if (userError || leagueError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">
          Error: {userError || leagueError}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container min-h-[calc(100vh-4rem)] mx-auto p-6">
        {paymentStatus === "success" && (
          <div className="mb-6">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment successful! Your league credits have been added to your
                account.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <ProfileCompletionModal
        isOpen={needsProfileCompletion}
        onComplete={updateProfile}
      />
    </>
  );
}
