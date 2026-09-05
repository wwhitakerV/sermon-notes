CREATE TABLE "library_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"video_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_notes" (
	"video_id" text PRIMARY KEY NOT NULL,
	"notes" jsonb NOT NULL,
	"meta" jsonb,
	"notes_version" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "library_entries" ADD CONSTRAINT "library_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "library_entries_user_video_key" ON "library_entries" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "library_entries_user_id_idx" ON "library_entries" USING btree ("user_id");