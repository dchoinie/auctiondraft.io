"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Clock, Gavel } from "lucide-react";

interface BiddingInterfaceProps {
  currentBid: number;
  onBid: (amount: number) => void;
  onStartCountdown: () => void;
}

export function BiddingInterface({
  currentBid,
  onBid,
  onStartCountdown,
}: BiddingInterfaceProps) {
  const [bidAmount, setBidAmount] = useState(currentBid + 1);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update bid amount when current bid changes
  useEffect(() => {
    setBidAmount(currentBid + 1);
  }, [currentBid]);

  const handleBidChange = (value: string) => {
    const amount = parseInt(value) || 0;
    setBidAmount(amount);

    if (amount <= currentBid) {
      setError(`Bid must be higher than current bid of $${currentBid}`);
    } else {
      setError(null);
    }
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

  const quickBidAmounts = [
    currentBid + 1,
    currentBid + 2,
    currentBid + 5,
    currentBid + 10,
  ];

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

          {/* Quick Bid Buttons */}
          <div className="space-y-2">
            <Label>Quick Bid</Label>
            <div className="grid grid-cols-2 gap-2">
              {quickBidAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBidAmount(amount)}
                  className="justify-start"
                >
                  ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Bid Amount */}
          <div className="space-y-2">
            <Label htmlFor="bid-amount">Custom Bid Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="bid-amount"
                type="number"
                min={currentBid + 1}
                value={bidAmount}
                onChange={(e) => handleBidChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Minimum bid: ${currentBid + 1}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePlaceBid}
              disabled={bidAmount <= currentBid || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? "Placing Bid..." : `Bid $${bidAmount}`}
            </Button>

            <Button
              onClick={onStartCountdown}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Clock className="h-4 w-4 mr-2" />
              Start Countdown
            </Button>
          </div>

          {/* Bidding Tips */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Bidding Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Bids must be higher than the current high bid</li>
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
