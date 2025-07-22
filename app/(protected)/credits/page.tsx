"use client";

import { useState } from "react";
import PageTitle from "@/components/PageTitle";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Loader2, CheckCircle } from "lucide-react";

const CREDIT_OPTIONS = [
  { credits: 1, label: "1 Credit", price: 9.99 },
  { credits: 3, label: "3 Credits", price: 24.99 },
  { credits: 5, label: "Unlimited", price: 44.99 },
];

export default function CreditsPage() {
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePurchase = async (credits: number) => {
    setLoading(credits);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to initiate checkout.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initiate checkout."
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle
        title="Buy League Credits"
        subtitle="Purchase credits to create or join more leagues."
      >
        <div className="mt-4 mb-8 text-gray-300">
          <ol className="list-decimal list-inside space-y-1">
            <li>Select a credit package below.</li>
            <li>Complete your payment securely via Stripe.</li>
            <li>
              After payment, your credits will be added to your account
              automatically.
            </li>
          </ol>
        </div>
      </PageTitle>

      {error && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="my-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Payment successful! Your credits will be available shortly.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {CREDIT_OPTIONS.map((option) => (
          <Card
            key={option.credits}
            className="flex flex-col justify-between h-full"
          >
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">
                {option.label}
              </CardTitle>
              <CardDescription className="text-lg text-gray-700 font-bold mt-2">
                ${option.price.toFixed(2)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>
                  {option.credits === 1 && "Create 1 league"}
                  {option.credits === 3 && "Create up to 3 leagues"}
                  {option.credits === 5 &&
                    "Create unlimited leagues for the season"}
                </li>
                <li>Instant credit delivery after payment</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => handlePurchase(option.credits)}
                disabled={loading === option.credits}
              >
                {loading === option.credits ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to Checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Buy for ${option.price.toFixed(2)}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
