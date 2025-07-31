"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, LogOut, X } from "lucide-react";
import { SidebarNavigation } from "./SidebarNavigation";
import { useUser } from "@/stores/userStore";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";

// Helper function to format credits display
const formatCredits = (credits: number | undefined) => {
  if (credits === undefined || credits === null) return "0";
  if (credits === -1) return "∞";
  return credits.toString();
};

interface MobileSidebarProps {
  children: React.ReactNode;
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useUser();

  return (
    <>
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 z-50 w-64 border-r">
              <div className="flex items-center justify-between h-16 px-6 border-b">
                <h1 className="text-xl font-bold text-white">
                  Auction Draft IO
                </h1>
                <div className="flex items-center gap-2">
                  <h6 className="italic mr-2">
                    League Credits: {formatCredits(user?.leagueCredits)}
                  </h6>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close sidebar</span>
                </Button>
              </div>
              <div className="flex-1 overflow-auto">
                <div className="p-4">
                  <SidebarNavigation />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top navbar */}
        <header className="flex justify-between h-16 items-center gap-4 border-b bg-gradient-to-r from-emerald-900 to-gray-900 px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div>
            <h6 className="text-lg font-bold text-gray-50">AuctionDraft.io</h6>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-center">
              <h6 className="italic mr-2 text-gray-50 m-0 p-0">
                League Credits: {formatCredits(user?.leagueCredits)}
              </h6>
              <Button asChild variant="link" className="h-6 text-yellow-600">
                <Link href="/credits">Buy More Credits</Link>
              </Button>
            </div>
            <SignOutButton>
              <Button
                size="sm"
                className="bg-red-700 text-gray-50 hover:bg-red-500 hover:text-gray-50"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </div>
              </Button>
            </SignOutButton>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </>
  );
}
