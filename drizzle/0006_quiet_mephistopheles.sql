ALTER TABLE "video_notes" ADD COLUMN "slug" text;--> statement-breakpoint
CREATE UNIQUE INDEX "video_notes_slug_key" ON "video_notes" USING btree ("slug");