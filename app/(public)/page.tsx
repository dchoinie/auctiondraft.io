"use client";

import type { NextPage } from "next";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Trophy,
  Zap,
  Target,
  Users,
  Shield,
  Smartphone,
  CheckCircle,
} from "lucide-react";

const Home: NextPage = () => {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  return <div className="min-h-screen bg-background"></div>;
};

export default Home;
