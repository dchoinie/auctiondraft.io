import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface StripeSetupStatus {
  needsSetup: boolean;
  hasCredits: boolean;
  credits: number;
  loading: boolean;
  error: string | null;
  initiatePayment: () => Promise<void>;
  checkSetupStatus: () => void;
}

export function useStripeSetup(): StripeSetupStatus {
  const { userId, isLoaded } = useAuth();
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasCredits, setHasCredits] = useState(false);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSetupStatus = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/setup-status");
      const data = await response.json();

      if (data.success) {
        setHasCredits(data.credits > 0);
        setCredits(data.credits);
        setNeedsSetup(!data.stripeCustomerId || data.credits === 0);
      } else {
        setError(data.error || "Failed to check setup status");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to check setup status"
      );
    } finally {
      setLoading(false);
    }
  };

  const initiatePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          creditPackage: "basic", // This could be dynamic
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initiate payment"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    checkSetupStatus();
  }, [userId, isLoaded]);

  return {
    needsSetup,
    hasCredits,
    credits,
    loading,
    error,
    initiatePayment,
    checkSetupStatus,
  };
}
