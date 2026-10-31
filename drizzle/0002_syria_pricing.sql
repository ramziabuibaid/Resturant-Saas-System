CREATE TABLE "exchange_rate_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"currency_code" text NOT NULL,
	"rate" numeric(14, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "secondary_round_step" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "show_secondary_first" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "restaurants" ADD COLUMN "prices_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "exchange_rate_history" ADD CONSTRAINT "exchange_rate_history_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exchange_rate_history_restaurant_idx" ON "exchange_rate_history" USING btree ("restaurant_id","created_at");