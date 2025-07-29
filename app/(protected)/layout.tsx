import {
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  ClerkLoading,
  ClerkLoaded,
} from "@clerk/nextjs";
import React from "react";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Loader2, Trophy } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <div className="flex min-h-[100vh]">
          <ClerkLoading>
            <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-r from-emerald-900 to-gray-900">
              <span className="text-white flex gap-6">
                <Loader2 className="w-8 h-8 animate-spin" />
                <Trophy className="w-8 h-8" />
                <span className="text-md">AuctionDraft.io Loading...</span>
              </span>
            </div>
          </ClerkLoading>
          <ClerkLoaded>
            <DesktopSidebar />
            <MobileSidebar>
              <PageTransition>{children}</PageTransition>
            </MobileSidebar>
          </ClerkLoaded>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
