CREATE TYPE "public"."subscription_plan" AS ENUM('basic', 'pro', 'chain');--> statement-breakpoint
CREATE TABLE "subscription_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"plan" "subscription_plan" NOT NULL,
	"months" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency_code" text DEFAULT 'USD' NOT NULL,
	"note" text,
	"period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "plan" "subscription_plan" DEFAULT 'pro' NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "trial_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "paid_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_payments_restaurant_idx" ON "subscription_payments" USING btree ("restaurant_id","created_at");--> statement-breakpoint
-- المطاعم التجريبية الحالية: 30 يوماً من تاريخ إنشائها
UPDATE "restaurants" SET "trial_ends_at" = "created_at" + interval '30 days' WHERE "status" = 'trial' AND "trial_ends_at" IS NULL;
