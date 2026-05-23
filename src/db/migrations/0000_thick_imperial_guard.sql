CREATE TABLE "ngos" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"description" text,
	"website" varchar(255),
	"is_verified" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ngos_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "rescue_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporter_name" varchar(255),
	"reporter_phone" varchar(20) NOT NULL,
	"animal_type" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"ngo_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rescue_reports" ADD CONSTRAINT "rescue_reports_ngo_id_ngos_id_fk" FOREIGN KEY ("ngo_id") REFERENCES "public"."ngos"("id") ON DELETE no action ON UPDATE no action;