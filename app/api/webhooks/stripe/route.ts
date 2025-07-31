import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { userProfiles, payments } from "@/app/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // For development: skip webhook verification if secret is not set
  if (!STRIPE_WEBHOOK_SECRET && process.env.NODE_ENV === "development") {
    console.log("⚠️  Skipping webhook verification in development mode");
    return NextResponse.json({ received: true });
  }

  const sig = req.headers.get("stripe-signature");
  const buf = await req.arrayBuffer();
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      Buffer.from(buf),
      sig!,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Get metadata from the session
    const userId = session.metadata?.userId;
    const creditsGranted = parseInt(session.metadata?.creditsGranted || "0");

    if (!userId || !creditsGranted) {
      console.error("Missing userId or creditsGranted in session metadata");
      return NextResponse.json(
        { error: "Missing required metadata" },
        { status: 400 }
      );
    }

    try {
      // Get user from database
      const user = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, userId))
        .limit(1);

      if (!user[0]) {
        console.error("User not found:", userId);
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Insert payment record
      await db.insert(payments).values({
        userId: userId,
        stripePaymentId: session.payment_intent as string,
        creditsGranted: creditsGranted,
        amount: session.amount_total || 0,
      });

      // Update user's league credits
      const currentCredits = user[0].leagueCredits || 0;
      
      // Handle unlimited credits (represented as -1)
      let newCredits: number;
      if (creditsGranted === -1) {
        newCredits = -1; // Set to unlimited
      } else {
        newCredits = currentCredits + creditsGranted;
      }
      
      await db
        .update(userProfiles)
        .set({
          leagueCredits: newCredits,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.id, userId));

      console.log(
        `Successfully processed payment for user ${userId}, granted ${creditsGranted} credits`
      );
    } catch (error) {
      console.error("Error processing payment:", error);
      return NextResponse.json(
        { error: "Failed to process payment" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
