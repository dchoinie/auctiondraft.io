"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Gavel, Minus, Plus } from "lucide-react";

interface BiddingInterfaceProps {
  currentBid: number;
  onBid: (amount: number) => void;
  onStartCountdown: () => void;
  disabled?: boolean;
}

export function BiddingInterface({
  currentBid,
  onBid,
  onStartCountdown,
  disabled = false,
}: BiddingInterfaceProps) {
  const [bidAmount, setBidAmount] = useState(currentBid + 1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update bid amount when current bid changes
  useEffect(() => {
    setBidAmount(currentBid + 1);
  }, [currentBid]);

  const handleDecreaseBid = () => {
    const newAmount = Math.max(currentBid + 1, bidAmount - 1);
    setBidAmount(newAmount);
    setError(null);
  };

  const handleIncreaseBid = () => {
    setBidAmount(bidAmount + 1);
    setError(null);
  };

  const handlePlaceBid = async () => {
    if (bidAmount <= currentBid) {
      setError(`Bid must be higher than current bid of $${currentBid}`);
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);
      await onBid(bidAmount);

      // Reset to next increment
      setBidAmount(bidAmount + 1);
    } catch (err) {
      setError("Failed to place bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Place Your Bid
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Current Bid Display */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current High Bid</span>
              <span className="text-2xl font-bold text-orange-600">
                ${currentBid}
              </span>
            </div>
          </div>

          {/* Bid Controls */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecreaseBid}
                disabled={bidAmount <= currentBid + 1 || disabled}
                className="px-3"
              >
                <Minus className="h-4 w-4" />
              </Button>

              <Button
                onClick={handlePlaceBid}
                disabled={bidAmount <= currentBid || isSubmitting || disabled}
                className="flex-1"
                size="lg"
              >
                {isSubmitting || disabled
                  ? "Placing Bid..."
                  : `Bid $${bidAmount}`}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleIncreaseBid}
                disabled={disabled}
                className="px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Minimum bid: ${currentBid + 1}
            </p>
          </div>

          {/* Start Countdown Button */}
          <Button
            onClick={onStartCountdown}
            variant="outline"
            className="w-full"
            size="lg"
            disabled={disabled}
          >
            <Clock className="h-4 w-4 mr-2" />
            Start Countdown
          </Button>

          {/* Bidding Tips */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Bidding Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use +/- to adjust your bid amount</li>
              <li>• Starting a countdown gives others 10 seconds to bid</li>
              <li>• If no one bids during countdown, you win the player</li>
              <li>• New bids will cancel any active countdown</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
