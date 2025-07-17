// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Check if the required environment variable is set
if (!process.env.POSTGRES_URL_NON_POOLING) {
  console.error("❌ POSTGRES_URL_NON_POOLING environment variable is not set!");
  console.log("📝 Please make sure your .env.local file contains:");
  console.log('POSTGRES_URL_NON_POOLING="your_supabase_connection_string"');
  process.exit(1);
}

export default defineConfig({
  schema: "./app/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING,
  },
});
