import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Next.js serverless routes work best with Neon's HTTP driver.
// Because it connects statelessly over HTTP, we no longer need 
// the globalThis singleton pattern or pg Pool!
const sql = neon(databaseUrl);
export const db = drizzle(sql);