import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Map league credits to Stripe Price IDs (update with your actual price IDs)
const CREDIT_PRICE_MAP: Record<number, string> = {
  1: process.env.NEXT_PUBLIC_STRIPE_1_LEAGUE_PRICE_ID!, // Replace with your Stripe Price ID for 1 league
  3: process.env.NEXT_PUBLIC_STRIPE_3_LEAGUE_PRICE_ID!, // Replace with your Stripe Price ID for 3 leagues
  5: process.env.NEXT_PUBLIC_STRIPE_UNLIMIED_PRICE_ID!, // Replace with your Stripe Price ID for 5 leagues
};

export async function POST(req: NextRequest) {
  try {
    const { credits } = await req.json();
    if (!credits || !CREDIT_PRICE_MAP[credits]) {
      return NextResponse.json(
        { error: "Invalid credits amount" },
        { status: 400 }
      );
    }

    // Optionally, get the user's email from the request/session
    // const { user } = auth();
    // const customer_email = user?.emailAddresses[0]?.emailAddress;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: CREDIT_PRICE_MAP[credits],
          quantity: 1,
        },
      ],
      mode: "payment",
      // customer_email,
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
