import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import React from "react";
import { DesktopSidebar } from "@/components/DesktopSidebar";
import { MobileSidebar } from "@/components/MobileSidebar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <div className="flex h-screen bg-background">
          <DesktopSidebar />
          <MobileSidebar>{children}</MobileSidebar>
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
