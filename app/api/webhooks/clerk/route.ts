import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { syncClerkUserToDatabase } from "@/lib/userSync";

export async function POST(req: NextRequest) {
  try {
    console.log("🔔 Clerk webhook received");
    
    const evt = await verifyWebhook(req);
    console.log("✅ Webhook verified, event type:", evt.type);
    console.log("📋 Event data:", JSON.stringify(evt.data, null, 2));

    if (evt.type === "user.created") {
      console.log("👤 Processing user.created event");
      console.log("📧 User email addresses:", evt.data.email_addresses);
      console.log("👤 User first name:", evt.data.first_name);
      console.log("👤 User last name:", evt.data.last_name);
      
      try {
        const result = await syncClerkUserToDatabase(evt.data);
        console.log("✅ User synced successfully:", result);
      } catch (syncError) {
        console.error("❌ Error syncing user to database:", syncError);
        // Don't return error response here, just log it
        // This prevents webhook from being marked as failed
      }
    } else {
      console.log("⏭️ Skipping non-user.created event");
    }

    return new Response("Webhook received", { status: 200 });
  } catch (err) {
    console.error("❌ Error verifying webhook:", err);
    return new Response("Error verifying webhook", { status: 400 });
  }
}
