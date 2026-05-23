import 'dotenv/config';
import { sql } from "drizzle-orm";

import { db } from "./db/db.js";
import app from "./app.js";
import { env } from "./config/env.js";
import { auth } from "./lib/auth.js";

import { globalErrorHandler } from "./middlewares/error.js";
import ApiError from "./utils/apiError.js";


async function startServer() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("PostgreSQL (via Drizzle) connection successful!");

    // start your app here
    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
    });

  } catch (err) {
    console.error("Server startup failed:", err);
    process.exit(1);
  }
}

async function checkDatabaseHealth() {
  try {
    await db.execute(sql`SELECT 1`);
    console.log("Database connection successful.");

    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ngos'
      );
    `);

    const tableExists = result.rows[0].exists;

    console.log("Table Exists? ", tableExists)

  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

checkDatabaseHealth();
startServer();