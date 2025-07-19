"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, TrendingUp, Trophy } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Bid {
  id: string;
  teamId: string;
  amount: number;
  timestamp: number;
}

interface Team {
  id: string;
  name: string;
}

interface BidHistoryProps {
  bids: Bid[];
  teams: Team[];
}

export function BidHistory({ bids, teams }: BidHistoryProps) {
  const getTeamName = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    return team?.name || "Unknown Team";
  };

  const sortedBids = [...bids].sort((a, b) => b.timestamp - a.timestamp);

  if (bids.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Bid History ({bids.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-3">
            {sortedBids.map((bid, index) => (
              <div
                key={bid.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  index === 0
                    ? "bg-green-50 border-green-200 ring-2 ring-green-200"
                    : "bg-card border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <Trophy className="h-4 w-4 text-green-600" />
                    )}
                    <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">{getTeamName(bid.teamId)}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(bid.timestamp), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={index === 0 ? "default" : "secondary"}
                    className="text-lg font-bold px-3 py-1"
                  >
                    ${bid.amount}
                  </Badge>
                  {index === 0 && (
                    <Badge
                      variant="outline"
                      className="text-green-600 border-green-600"
                    >
                      High Bid
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Bidding Statistics */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Bids</p>
              <p className="font-bold">{bids.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Starting Bid</p>
              <p className="font-bold">
                ${Math.min(...bids.map((b) => b.amount))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current High</p>
              <p className="font-bold text-green-600">
                ${Math.max(...bids.map((b) => b.amount))}
              </p>
            </div>
          </div>
        </div>

        {/* Bidding Trend */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-blue-900">Bidding Trend</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {sortedBids.reverse().map((bid, index) => (
              <div key={bid.id} className="flex-shrink-0 text-center">
                <div
                  className="w-12 h-8 bg-blue-200 rounded flex items-center justify-center text-xs font-semibold"
                  style={{
                    height: `${20 + (bid.amount / Math.max(...bids.map((b) => b.amount))) * 40}px`,
                  }}
                >
                  ${bid.amount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {index + 1}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
