CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"device_id" uuid,
	"user_id" uuid,
	"video_id" text,
	"props" jsonb
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_device_time_idx" ON "events" USING btree ("device_id","occurred_at");--> statement-breakpoint
CREATE INDEX "events_name_time_idx" ON "events" USING btree ("name","occurred_at");