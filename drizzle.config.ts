// drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./app/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use non-pooling connection string for Drizzle Studio (better for schema introspection)
    url: process.env.POSTGRES_URL_NON_POOLING!,
  },
});
