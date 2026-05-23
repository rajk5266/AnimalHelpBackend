// import 'dotenv/config';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { Pool } from 'pg';
// import * as schema from './schema.js'; // Ensure you have a schema file

// // 1. Create the connection pool
// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// // 2. Initialize Drizzle
// export const db = drizzle(pool, { schema });

// // Optional: Test the connection immediately
// pool.query('SELECT NOW()')
//   .then(() => console.log('✅ PostgreSQL connected successfully'))
//   .catch((err) => console.error('❌ Database connection failed:', err));

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL 
});

export const db = drizzle(pool, { schema });
export { pool };