import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For queries
const queryClient = postgres(connectionString, {
  max: 10, // maximum pool size
  idle_timeout: 30, // max idle time for connections
  connect_timeout: 30, // connection timeout
});
export const db = drizzle(queryClient, { schema });
