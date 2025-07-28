import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../app/schema";

// Use the pooling connection string instead of non-pooling
const connectionString =
  process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING!;

// Create the connection with proper pooling configuration
const client = postgres(connectionString, {
  max: 10, // Allow more connections since we're using proper pooling
  idle_timeout: 20, // Keep connections alive for 20 seconds
  connect_timeout: 30, // Connection timeout of 30 seconds
  max_lifetime: 60 * 30, // Keep connections alive for 30 minutes
  prepare: false, // Disable prepared statements for better performance
  ssl: "require", // Supabase requires SSL
  connection: {
    application_name: "auctiondraftio", // Add application name for monitoring
  },
  // Handle undefined values properly
  transform: {
    undefined: null,
  },
  onnotice: (notice) => {
    console.log("Database notice:", notice);
  },
  onparameter: (parameterStatus) => {
    console.log("Database parameter change:", parameterStatus);
  },
});

// Create the database instance
export const db = drizzle(client, { schema });

// Export the client for manual connection management if needed
export { client as postgresClient };

// Database health check function
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  error?: string;
}> {
  try {
    const startTime = Date.now();
    await client`SELECT 1`;
    const responseTime = Date.now() - startTime;

    console.log(`✅ Database health check passed (${responseTime}ms)`);
    return { healthy: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Database health check failed:", errorMessage);
    return { healthy: false, error: errorMessage };
  }
}

// Utility function for database operations with retry logic
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // If it's not a connection timeout, don't retry
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "CONNECT_TIMEOUT"
      ) {
        throw error;
      }

      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(
        `Database connection timeout, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
