"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLeagueAdmin } from "@/stores/leagueStore";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarNavigationProps {
  leagueId?: string;
}

export function SidebarNavigation({ leagueId }: SidebarNavigationProps) {
  const pathname = usePathname();
  const { isAdmin, loading } = useLeagueAdmin(leagueId);

  // Extract league ID from pathname if not provided
  const pathLeagueId = leagueId || pathname.match(/\/leagues\/([^\/]+)/)?.[1];

  // Define which navigation items are admin-only
  const adminOnlyItems = [
    "Create League",
    "Manage Teams",
    "Buy Credits",
    "Settings",
  ];

  // Global navigation items (always visible)
  const globalItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Leagues", href: "/leagues" },
    { label: "My Teams", href: "/teams" },
    { label: "Players", href: "/players" },
  ];

  // League-specific items (only visible when in a league context)
  const leagueItems = [
    { label: "Draft Room", href: (id: string) => `/leagues/${id}/draft` },
    { label: "Manage Teams", href: (id: string) => `/leagues/${id}/teams` },
  ];

  // Admin-only items
  const adminItems = [
    { label: "Create League", href: "/leagues/create" },
    { label: "Buy Credits", href: "/billing" },
    { label: "Settings", href: "/settings" },
  ];

  const isActive = (href: string) => {
    if (typeof href === "function") return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="space-y-6">
      {/* Global Navigation */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Main
        </h3>
        <div className="space-y-1">
          {globalItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* League Navigation (only show when in league context) */}
      {pathLeagueId && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            League
          </h3>
          <div className="space-y-1">
            {leagueItems.map((item) => {
              const href =
                typeof item.href === "function"
                  ? item.href(pathLeagueId)
                  : item.href;

              // Skip admin-only items if user is not admin
              if (adminOnlyItems.includes(item.label) && !isAdmin) {
                return null;
              }

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive(href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {item.label}
                  {adminOnlyItems.includes(item.label) && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Admin
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Navigation (only show for admins) */}
      {isAdmin && !loading && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Admin
          </h3>
          <div className="space-y-1">
            {adminItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive(item.href)
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {item.label}
                <Badge variant="secondary" className="ml-2 text-xs">
                  Admin
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
        </div>
      )}
    </div>
  );
}
