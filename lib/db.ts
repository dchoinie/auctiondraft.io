import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../app/schema";

const connectionString = process.env.POSTGRES_URL_NON_POOLING!;

// Create the connection
const client = postgres(connectionString);

// Create the database instance
export const db = drizzle(client, { schema });
