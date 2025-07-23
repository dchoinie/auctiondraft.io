"use client";

import Link from "next/link";
import { League } from "@/stores/leagueStore";
import { useUserStore } from "@/stores/userStore";
import { useLeagueStore } from "@/stores/leagueStore";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { Home, Plus, Users } from "lucide-react";
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

  return (
    <>
      <div className="flex flex-col mt-3 gap-3">
        {navItems.map((item: NavItem, i: number) => (
          <Button
            asChild
            className={cn("font-exo2 bg-emerald-800 hover:bg-emerald-700")}
            key={`${item.label}-${i}`}
          >
            <Link href={item.href}>
              {item.icon}
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3 mt-3">
        <h5 className="text-gray-50 font-exo2 text-sm my-3">My Leagues</h5>
        {leagues.length > 0 ? (
          leagues.map((league: League) => (
            <Button
              asChild
              key={league.id}
              variant="ghost"
              className="w-full bg-gradient-to-br from-emerald-900/80 to-emerald-700/80 border-2 border-emerald-400 shadow-md hover:shadow-xl cursor-pointer h-auto"
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
                    <Badge className="bg-yellow-600 hover:bg-yellow-600 text-gray-50 self-start mt-1">
                      Admin
                    </Badge>
                  )}
                </div>
              </Link>
            </Button>
          ))
        ) : (
          <p className="text-gray-50">No leagues found</p>
        )}
      </div>
    </>
  );
}
