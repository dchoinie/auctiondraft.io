import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface ProfileCompletionStatus {
  needsCompletion: boolean;
  loading: boolean;
  error: string | null;
  profile: ProfileData | null;
  updateProfile: (firstName: string, lastName: string) => Promise<boolean>;
}

export function useProfileCompletion(): ProfileCompletionStatus {
  const { userId, isLoaded } = useAuth();
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await fetch("/api/profile");
      const data = await response.json();

      if (data.success) {
        setProfile(data.profile);
        setNeedsCompletion(!data.profile.firstName || !data.profile.lastName);
      } else {
        setError(data.error || "Failed to fetch profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (
    firstName: string,
    lastName: string
  ): Promise<boolean> => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ firstName, lastName }),
      });

      const data = await response.json();

      if (data.success) {
        setProfile((prev) => (prev ? { ...prev, firstName, lastName } : null));
        setNeedsCompletion(false);
        return true;
      } else {
        setError(data.error || "Failed to update profile");
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
      return false;
    }
  };

  useEffect(() => {
    if (!isLoaded || !userId) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [userId, isLoaded]);

  return {
    needsCompletion,
    loading,
    error,
    profile,
    updateProfile,
  };
}
