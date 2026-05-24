import {
  pgTable,
  serial,
  text,
  varchar,
  doublePrecision,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import * as t from "drizzle-orm/pg-core";

// ─── ENUMS ─────────────────────────────────────────────
export const roleEnum = pgEnum("role", [
  "user",
  "admin",
  "ngo_owner",
  "superadmin",
]);

// ─── ENUMS (Add this to your existing enums) ───────────
export const organizationTypeEnum = pgEnum("organization_type", [
  "ngo",
  "clinic",
  "shelter",
  "rescue_center",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
]);

// ─── BETTER AUTH TABLES ────────────────────────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").default(false),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  activeOrganizationId: text("active_organization_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(), 
});

// ─── ORGANIZATION TABLE UPDATE ────────────────────────
export const organization = pgTable("organization", {
  // Better Auth fields
  id: t.text("id").primaryKey(),
  name: t.text("name").notNull(),
  slug: t.varchar("slug", { length: 255 }).notNull().unique(),
  logo: t.text("logo"),
  metadata: t.jsonb("metadata").default({}),
  createdAt: t.timestamp("created_at", { withTimezone: true }).notNull(),
  
  // 🚀 Add the missing 'type' column here to clear the compiler error!
  type: organizationTypeEnum("type").default("ngo").notNull(),

  // Your custom fields
  phone: t.varchar("phone", { length: 20 }),
  address: t.text("address"),
  website: t.varchar("website", { length: 255 }),
  description: t.text("description"),
  latitude: t.doublePrecision("latitude"),
  longitude: t.doublePrecision("longitude"),
  verified: t.boolean("verified").default(false),
  verificationStatus: verificationStatusEnum("verification_status").default("pending"),
  verifiedAt: t.timestamp("verified_at"),
  rejectedReason: t.text("rejected_reason"),
});

// Better Auth organization plugin tables
export const member = pgTable("member", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invitation = pgTable("invitation", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  inviterId: text("inviter_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── USER PROFILE ──────────────────────────────────────
export const userProfile = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: roleEnum("role").default("user"),
  professions: jsonb("professions").$type<string[]>().default([]),
  isVerified: boolean("is_verified").default(false),
  trustScore: integer("trust_score").default(0),
  karmaPoints: integer("karma_points").default(0),
  totalReports: integer("total_reports").default(0),
  successfulRescues: integer("successful_rescues").default(0),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").default(true),
  isBanned: boolean("is_banned").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});