ALTER TABLE "organization" DROP CONSTRAINT "organization_owner_id_unique";--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_owner_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "owner_id";