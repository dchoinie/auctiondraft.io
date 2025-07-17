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
    console.log("Creating checkout session...");

    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not set");
      return NextResponse.json(
        {
          success: false,
          error: "Stripe configuration error",
        },
        { status: 500 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      console.log("User not authenticated");
      return NextResponse.json(
        {
          success: false,
          error: "Not authenticated",
        },
        { status: 401 }
      );
    }

    console.log("User authenticated:", userId);

    const body = await req.json();
    const { creditPackage } = body;

    console.log("Credit package:", creditPackage);

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
      console.log("User not found in database");
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    console.log("User found in database:", user.email);

    const packageInfo =
      CREDIT_PACKAGES[creditPackage as keyof typeof CREDIT_PACKAGES];

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      console.log("Creating new Stripe customer");
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId,
        },
      });

      stripeCustomerId = customer.id;
      console.log("Created Stripe customer:", stripeCustomerId);

      // Update user with Stripe customer ID
      await db
        .update(userProfiles)
        .set({ stripeCustomerId })
        .where(eq(userProfiles.id, userId));
    }

    // Get the base URL for redirects
    let baseUrl: string;

    if (process.env.NODE_ENV === "development") {
      baseUrl = "http://localhost:3000";
    } else {
      // For production, use environment variable or construct from request headers
      const host = req.headers.get("host");
      const protocol = req.headers.get("x-forwarded-proto") || "https";
      baseUrl =
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        `${protocol}://${host}`;
    }

    console.log("Base URL:", baseUrl);
    console.log("Environment:", process.env.NODE_ENV);
    console.log("APP_URL:", process.env.APP_URL);
    console.log("NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);

    // Create checkout session
    console.log("Creating Stripe checkout session");
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
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url: `${baseUrl}/dashboard?payment=cancelled`,
      metadata: {
        userId: userId,
        creditPackage: creditPackage,
        creditsGranted: packageInfo.credits.toString(),
      },
    });

    console.log("Checkout session created:", session.id);

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);

    // Return more specific error information
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
