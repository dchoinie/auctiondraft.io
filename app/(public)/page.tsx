"use client";

import type { NextPage } from "next";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Trophy,
  LogInIcon,
  UserPlusIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const Home: NextPage = () => {
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <div className="min-h-screen h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>

        <div className="relative z-10 container mx-auto px-4 pt-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo/Brand */}
            <div className="flex items-center justify-center mb-8">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-2xl mr-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                AuctionDraft.io
              </h1>
            </div>

            {/* Main Headline */}
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              The Ultimate
              <span className="block bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Fantasy Football
              </span>
              Auction Experience
            </h2>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Host real-time auction drafts with your league. Bid, strategize,
              and build your championship team with the most advanced fantasy
              football auction platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button asChild className="green-bg">
                <SignUpButton mode="modal">
                  <button>
                    <UserPlusIcon className="w-5 h-5 mr-2" />
                    Sign Up
                  </button>
                </SignUpButton>
              </Button>

              <Button asChild className="gray-bg">
                <SignInButton mode="modal">
                  <button>
                    <LogInIcon className="w-5 h-5 mr-2" />
                    Sign In
                  </button>
                </SignInButton>
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-green-500/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-lime-500/10 rounded-full blur-xl"></div>
      </div>
    </div>
  );
};

export default Home;
