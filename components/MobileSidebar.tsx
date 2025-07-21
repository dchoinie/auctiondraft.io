"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { SidebarNavigation } from "./SidebarNavigation";
import { useUser } from "@/stores/userStore";
import Link from "next/link";
import dynamic from "next/dynamic";

interface MobileSidebarProps {
  children: React.ReactNode;
}

const UserButton = dynamic(
  () => import("@clerk/nextjs").then((mod) => mod.UserButton),
  { ssr: false }
);

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useUser();

  console.log(user);

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
                    League Credits: {user?.leagueCredits}
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
          <div className="">
            <h6 className="text-lg font-bold text-white">
              Welcome Back, {user?.firstName}!
            </h6>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-col text-center">
              <h6 className="italic mr-2 text-gray-50 m-0 p-0">
                League Credits: {user?.leagueCredits}
              </h6>
              <Button
                asChild
                variant="link"
                className="h-6 font-exo2 text-gray-50"
              >
                <Link href="/credits">Buy More Credits</Link>
              </Button>
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                  userButtonPopoverCard: "bg-background border",
                  userButtonPopoverActionButton:
                    "text-foreground hover:bg-accent",
                  userButtonPopoverActionButtonText: "text-foreground",
                },
              }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </>
  );
}
