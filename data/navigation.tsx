export interface ProtectedNavigationItem {
  label: string;
  href: string | ((leagueId: string) => string);
  subItems?: ProtectedNavigationItem[];
  external?: boolean;
}

export const protectedNavigation: ProtectedNavigationItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "Leagues",
    href: "/leagues",
  },
  {
    label: "Create League",
    href: "/leagues/create",
  },
  {
    label: "Draft Room",
    href: (leagueId: string) => `/leagues/${leagueId}/draft`,
  },
  {
    label: "My Teams",
    href: "/teams",
  },
  {
    label: "Manage Teams",
    href: (leagueId: string) => `/leagues/${leagueId}/teams`,
  },
  {
    label: "Buy Credits",
    href: "/billing",
  },
  {
    label: "Settings",
    href: "/settings",
  },
];

// Utility function to get href value (handles both string and function)
export function getNavigationHref(
  item: ProtectedNavigationItem,
  leagueId?: string
): string {
  if (typeof item.href === "function") {
    if (!leagueId) {
      throw new Error(`League ID required for navigation item: ${item.label}`);
    }
    return item.href(leagueId);
  }
  return item.href;
}
