import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { getUserFromDatabase } from "@/lib/userSync";
import { db } from "@/lib/db";
import { userProfiles } from "@/app/schema";
import { eq } from "drizzle-orm";

const CREDIT_PACKAGES = {
  basic: {
    credits: 1,
    price: 999, // $9.99 in cents
    name: "Basic League Credits",
    description: "1 league credit to create your first league",
  },
  premium: {
    credits: 5,
    price: 3999, // $39.99 in cents
    name: "Premium League Credits",
    description: "5 league credits with a discount",
  },
};

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { creditPackage } = body;

    if (
      !creditPackage ||
      !CREDIT_PACKAGES[creditPackage as keyof typeof CREDIT_PACKAGES]
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid credit package",
        },
        { status: 400 }
      );
    }

    const user = await getUserFromDatabase(userId);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    const packageInfo =
      CREDIT_PACKAGES[creditPackage as keyof typeof CREDIT_PACKAGES];

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId,
        },
      });

      stripeCustomerId = customer.id;

      // Update user with Stripe customer ID
      await db
        .update(userProfiles)
        .set({ stripeCustomerId })
        .where(eq(userProfiles.id, userId));
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: packageInfo.name,
              description: packageInfo.description,
            },
            unit_amount: packageInfo.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=cancelled`,
      metadata: {
        userId: userId,
        creditPackage: creditPackage,
        creditsGranted: packageInfo.credits.toString(),
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
