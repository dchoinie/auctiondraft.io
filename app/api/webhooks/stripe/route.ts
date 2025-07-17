import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabaseClient";
import type Stripe from "stripe";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe Price IDs to credit amounts
const PRICE_ID_TO_CREDITS: Record<string, number> = {
  [process.env.NEXT_PUBLIC_STRIPE_1_LEAGUE_PRICE_ID!]: 1,
  [process.env.NEXT_PUBLIC_STRIPE_3_LEAGUE_PRICE_ID!]: 3,
  [process.env.NEXT_PUBLIC_STRIPE_UNLIMIED_PRICE_ID!]: 9999, // Use a large number for unlimited
};

export async function POST(req: NextRequest) {
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
    return NextResponse.json(
      { error: `Webhook Error: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail =
      session.customer_email || session.customer_details?.email;
    const lineItem = session.line_items?.data?.[0];
    const priceId =
      lineItem?.price?.id ||
      (typeof lineItem?.price === "string" ? lineItem.price : undefined);
    const credits = priceId ? PRICE_ID_TO_CREDITS[priceId] || 0 : 0;
    const amount = session.amount_total || session.amount_subtotal || 0;
    if (!customerEmail || !credits) {
      return NextResponse.json(
        { error: "Missing email or credits" },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("id, league_credits")
      .eq("email", customerEmail)
      .single();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Insert payment record
    await supabase.from("payments").insert({
      user_id: user.id,
      stripe_payment_id: session.payment_intent,
      credits_granted: credits,
      amount,
    });

    // Increment league_credits
    await supabase
      .from("user_profiles")
      .update({ league_credits: user.league_credits + credits })
      .eq("id", user.id);
  }

  return NextResponse.json({ received: true });
}
