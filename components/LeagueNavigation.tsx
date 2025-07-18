import Link from "next/link";
import { useLeagueAdmin } from "@/stores/leagueStore";
import { protectedNavigation, getNavigationHref } from "@/data/navigation";

interface LeagueNavigationProps {
  leagueId: string;
}

export function LeagueNavigation({ leagueId }: LeagueNavigationProps) {
  const { isAdmin, loading, error } = useLeagueAdmin(leagueId);

  if (loading) {
    return <div className="loading loading-spinner loading-md"></div>;
  }

  if (error) {
    return <div className="text-error">Error: {error}</div>;
  }

  // Define which navigation items are admin-only
  const adminOnlyItems = [
    "Create League",
    "Manage Teams",
    "Buy Credits",
    "Settings",
  ];

  return (
    <nav className="space-y-2">
      {protectedNavigation.map((item) => {
        // Skip admin-only items if user is not admin
        if (adminOnlyItems.includes(item.label) && !isAdmin) {
          return null;
        }

        const href = getNavigationHref(item, leagueId);

        return (
          <Link
            key={item.label}
            href={href}
            className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-md"
          >
            {item.label}
            {adminOnlyItems.includes(item.label) && (
              <span className="ml-2 badge badge-primary badge-sm">Admin</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
