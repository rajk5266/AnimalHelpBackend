CREATE TYPE "public"."role" AS ENUM('user', 'admin', 'ngo_owner');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"image" text,
	"role" "role" DEFAULT 'user' NOT NULL,
	"professions" jsonb DEFAULT '[]'::jsonb,
	"is_verified" boolean DEFAULT false,
	"verification_status" varchar(50) DEFAULT 'unverified',
	"trust_score" integer DEFAULT 0,
	"karma_points" integer DEFAULT 0,
	"total_reports" integer DEFAULT 0,
	"successful_rescues" integer DEFAULT 0,
	"phone" varchar(20),
	"is_active" boolean DEFAULT true,
	"is_banned" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
