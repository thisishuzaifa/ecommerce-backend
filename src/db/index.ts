import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const connectionString = process.env.DATABASE_URL!;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

// For migrations
export const migrationClient = postgres(connectionString, { 
  max: 1,
  ssl: { rejectUnauthorized: false }, // Required for Neon database
});

// For queries
const queryClient = postgres(connectionString, {
  max: 10, // maximum pool size
  idle_timeout: 30, // max idle time for connections
  connect_timeout: 30, // connection timeout
  ssl: { rejectUnauthorized: false }, // Required for Neon database
});

export const db = drizzle(queryClient, { schema });
