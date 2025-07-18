import React from "react";
import { SidebarNavigation } from "./SidebarNavigation";
import Link from "next/link";

export function DesktopSidebar() {
  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow border-r bg-muted/40">
        <div className="flex items-center h-16 px-6 border-b">
          <Link href="/dashboard">
            <h1 className="text-xl font-bold">Auction Draft IO</h1>
          </Link>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-4">
            <SidebarNavigation />
          </div>
        </div>
      </div>
    </div>
  );
}
