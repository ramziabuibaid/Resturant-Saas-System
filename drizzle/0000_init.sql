CREATE TYPE "public"."loyalty_tx_type" AS ENUM('earn', 'redeem_cash', 'redeem_reward', 'adjustment', 'expiry', 'bonus');--> statement-breakpoint
CREATE TYPE "public"."menu_banner_kind" AS ENUM('image', 'video');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('sms', 'whatsapp', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'processing', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_fulfillment" AS ENUM('dine_in', 'pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."restaurant_status" AS ENUM('active', 'trial', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'owner');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_public_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"last_access_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customer_public_links_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"phone_normalized" text NOT NULL,
	"name" text,
	"email" text,
	"preferred_channel" "notification_channel" DEFAULT 'sms' NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_order_at" timestamp with time zone,
	"order_count" integer DEFAULT 0 NOT NULL,
	"total_spent_cents" bigint DEFAULT 0 NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_redeemed" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_restaurant_phone_key" UNIQUE("restaurant_id","phone_normalized")
);
--> statement-breakpoint
CREATE TABLE "loyalty_reward_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"order_id" uuid,
	"loyalty_transaction_id" uuid NOT NULL,
	"points_spent" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"points_cost" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"stock" integer,
	"valid_from" timestamp with time zone,
	"valid_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"order_id" uuid,
	"tx_type" "loyalty_tx_type" NOT NULL,
	"points_delta" integer NOT NULL,
	"money_value_cents" integer DEFAULT 0 NOT NULL,
	"note" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"category_id" uuid,
	"name" text NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"price_options" jsonb,
	"secondary_price" integer,
	"secondary_price_options" jsonb,
	"image_url" text,
	"calories" text,
	"is_meal" boolean DEFAULT true NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"menu_item_id" uuid,
	"item_name" text NOT NULL,
	"price_option_label" text,
	"quantity" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"excluded_ingredients" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"display_number" integer NOT NULL,
	"tracking_token" text NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"fulfillment" "order_fulfillment" NOT NULL,
	"table_id" uuid,
	"waiter_id" uuid,
	"customer_id" uuid,
	"customer_phone" text NOT NULL,
	"customer_email" text,
	"delivery_address" text,
	"loyalty_points_used" integer DEFAULT 0 NOT NULL,
	"loyalty_discount_cents" integer DEFAULT 0 NOT NULL,
	"owner_discount_cents" integer DEFAULT 0 NOT NULL,
	"staff_notes" text,
	"completion_accounting_done" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_tracking_token_unique" UNIQUE("tracking_token"),
	CONSTRAINT "orders_restaurant_display_key" UNIQUE("restaurant_id","display_number")
);
--> statement-breakpoint
CREATE TABLE "outbound_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"template_key" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "notification_status" DEFAULT 'queued' NOT NULL,
	"provider_message_id" text,
	"error" text,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurant_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"label" text NOT NULL,
	"public_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"waiter_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurant_tables_public_token_unique" UNIQUE("public_token")
);
--> statement-breakpoint
CREATE TABLE "restaurant_waiters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"restaurant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subdomain" text NOT NULL,
	"custom_domain" text,
	"status" "restaurant_status" DEFAULT 'trial' NOT NULL,
	"logo_url" text,
	"headline" text,
	"subheadline" text,
	"hero_background_url" text,
	"footer_note" text,
	"menu_title_animation_enabled" boolean DEFAULT false NOT NULL,
	"menu_banner_url" text,
	"menu_banner_kind" "menu_banner_kind",
	"menu_banner_caption" text,
	"currency_code" text DEFAULT 'ILS' NOT NULL,
	"secondary_currency_enabled" boolean DEFAULT false NOT NULL,
	"secondary_currency_code" text,
	"secondary_currency_exchange_rate" numeric(14, 6),
	"phone_country_prefix" text,
	"public_address" text,
	"public_maps_url" text,
	"public_phone_1" text,
	"public_phone_2" text,
	"public_phone_3" text,
	"social_facebook_url" text,
	"social_instagram_url" text,
	"social_tiktok_url" text,
	"loyalty_program_enabled" boolean DEFAULT false NOT NULL,
	"loyalty_spend_cents_per_point" integer DEFAULT 100 NOT NULL,
	"loyalty_point_value_cents" integer DEFAULT 10 NOT NULL,
	"waiters_system_enabled" boolean DEFAULT false NOT NULL,
	"last_order_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "restaurants_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "restaurants_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"username" text,
	"password_hash" text NOT NULL,
	"full_name" text,
	"role" "user_role" DEFAULT 'owner' NOT NULL,
	"restaurant_id" uuid,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_restaurant_username_key" UNIQUE NULLS NOT DISTINCT("restaurant_id","username")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_public_links" ADD CONSTRAINT "customer_public_links_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_public_links" ADD CONSTRAINT "customer_public_links_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_reward_id_loyalty_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."loyalty_rewards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_reward_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_reward_redemptions" ADD CONSTRAINT "loyalty_redemptions_tx_fk" FOREIGN KEY ("loyalty_transaction_id") REFERENCES "public"."loyalty_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_rewards" ADD CONSTRAINT "loyalty_rewards_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_table_id_restaurant_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."restaurant_tables"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_waiter_id_restaurant_waiters_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."restaurant_waiters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_notifications" ADD CONSTRAINT "outbound_notifications_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_notifications" ADD CONSTRAINT "outbound_notifications_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_tables" ADD CONSTRAINT "restaurant_tables_waiter_id_restaurant_waiters_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."restaurant_waiters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restaurant_waiters" ADD CONSTRAINT "restaurant_waiters_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_restaurant_id_restaurants_id_fk" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_restaurant_idx" ON "categories" USING btree ("restaurant_id","order_index");--> statement-breakpoint
CREATE INDEX "customer_links_customer_idx" ON "customer_public_links" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "customers_restaurant_last_order_idx" ON "customers" USING btree ("restaurant_id","last_order_at");--> statement-breakpoint
CREATE INDEX "loyalty_redemptions_customer_idx" ON "loyalty_reward_redemptions" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_rewards_restaurant_idx" ON "loyalty_rewards" USING btree ("restaurant_id","active");--> statement-breakpoint
CREATE INDEX "loyalty_tx_customer_idx" ON "loyalty_transactions" USING btree ("customer_id","created_at");--> statement-breakpoint
CREATE INDEX "loyalty_tx_restaurant_idx" ON "loyalty_transactions" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_tx_one_earn_per_order" ON "loyalty_transactions" USING btree ("order_id") WHERE "loyalty_transactions"."tx_type" = 'earn';--> statement-breakpoint
CREATE INDEX "menu_items_restaurant_idx" ON "menu_items" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "menu_items_category_idx" ON "menu_items" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_restaurant_created_idx" ON "orders" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_restaurant_status_idx" ON "orders" USING btree ("restaurant_id","status");--> statement-breakpoint
CREATE INDEX "notifications_queue_idx" ON "outbound_notifications" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "notifications_restaurant_idx" ON "outbound_notifications" USING btree ("restaurant_id","created_at");--> statement-breakpoint
CREATE INDEX "restaurant_tables_restaurant_idx" ON "restaurant_tables" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "restaurant_waiters_restaurant_idx" ON "restaurant_waiters" USING btree ("restaurant_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_restaurant_idx" ON "users" USING btree ("restaurant_id");