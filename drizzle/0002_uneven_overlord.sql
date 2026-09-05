ALTER TABLE "users" ADD COLUMN "stripe_payment_method_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "card_brand" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "card_last4" text;