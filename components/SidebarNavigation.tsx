"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { League } from "@/stores/leagueStore";
import { useUserStore } from "@/stores/userStore";
import { useLeagueStore } from "@/stores/leagueStore";
import { Button } from "./ui/button";
import { Home, Plus, Users, Shield } from "lucide-react";
import { Badge } from "./ui/badge";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  {
    icon: <Home />,
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    icon: <Plus />,
    label: "Create A League",
    href: "/leagues/create",
  },
  {
    icon: <Users />,
    label: "Join A League",
    href: "/leagues/join",
  },
];

export function SidebarNavigation() {
  const { leagues } = useLeagueStore();
  const { user } = useUserStore();
  const pathname = usePathname();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  // Check if user is platform admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch("/api/admin/player-data-info");
        setIsPlatformAdmin(response.status !== 403);
      } catch (error) {
        setIsPlatformAdmin(false);
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const rosterSize = (league: League) => {
    return (
      (league.settings.qbSlots || 0) +
      (league.settings.rbSlots || 0) +
      (league.settings.wrSlots || 0) +
      (league.settings.teSlots || 0) +
      (league.settings.flexSlots || 0) +
      (league.settings.dstSlots || 0) +
      (league.settings.kSlots || 0) +
      (league.settings.benchSlots || 0)
    );
  };

  const isLeagueActive = (leagueId: string) => {
    return pathname.startsWith(`/leagues/${leagueId}`);
  };

  return (
    <>
      <div className="flex flex-col mt-3 gap-3">
        {navItems.map((item: NavItem, i: number) => (
          <Button
            asChild
            className="green-bg"
            key={`${item.label}-${i}`}
          >
            <Link href={item.href}>
              {item.icon}
              {item.label}
            </Link>
          </Button>
        ))}
        
        {/* Platform Admin Link - Only visible to platform admins */}
        {isPlatformAdmin && (
          <Button
            asChild
            className="bg-gradient-to-br from-red-900/80 to-red-700/80 border-2 border-red-400 shadow-md hover:shadow-xl"
          >
            <Link href="/admin">
              <Shield className="h-4 w-4 mr-2" />
              Platform Admin
            </Link>
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3 mt-3">
        <h5 className="text-gray-50 text-sm my-3">My Leagues</h5>
        {leagues.length > 0 ? (
          leagues.map((league: League) => {
            const isActive = isLeagueActive(league.id);
            return (
              <Button
                asChild
                key={league.id}
                variant="ghost"
                className={`w-full cursor-pointer h-auto transition-all duration-200 ${
                  isActive 
                    ? "bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-lg hover:shadow-xl" 
                    : "green-bg hover:shadow-xl"
                }`}
              >
                <Link href={`/leagues/${league.id}`}>
                  <div className="flex flex-col w-full">
                    <p className="text-gray-50">{league.name}</p>
                    <small className="text-gray-400 text-wrap">
                      {`${league.settings.leagueSize}-man`}
                      {`/${rosterSize(league)} roster`}
                      {`/$${league.settings.startingBudget} budget`}
                      {`/${league.settings.draftType} nominations`}
                    </small>
                    {user?.id === league.ownerId && (
                      <Badge className="bg-gradient-to-br from-yellow-900/80 to-yellow-700/80 border-2 border-yellow-400 shadow-md hover:shadow-xl text-gray-50 self-start mt-1">
                        Admin
                      </Badge>
                    )}
                  </div>
                </Link>
              </Button>
            );
          })
        ) : (
          <p className="text-gray-50">No leagues found</p>
        )}
      </div>
    </>
  );
}
