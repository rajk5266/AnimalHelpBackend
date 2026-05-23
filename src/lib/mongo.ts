// @ts-nocheck — legacy MongoDB client (not used in active routes; project uses PostgreSQL/Drizzle)
// src/lib/mongo.ts
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI!);

export const mongoClient = client.connect();
