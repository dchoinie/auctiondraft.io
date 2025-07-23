"use client";

import React from "react";
import { SidebarNavigation } from "./SidebarNavigation";
import { UserButton } from "@clerk/nextjs";
import { useUserStore } from "@/stores/userStore";

export function DesktopSidebar() {
  const { user } = useUserStore();
  return (
    <div className="hidden lg:flex lg:w-64 lg:flex-col bg-gradient-to-l from-emerald-900 to-gray-900">
      <div className="flex flex-col flex-grow border-r">
        <div className="flex items-center h-16 px-6 border-b">
          <UserButton />
          <p className="text-gray-50 ml-3 text-sm">
            Welcome Back, {user?.firstName}!
          </p>
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
