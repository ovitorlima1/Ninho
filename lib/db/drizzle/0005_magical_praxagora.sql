CREATE TABLE "gift_reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"checklist_item_id" integer NOT NULL,
	"share_link_id" integer NOT NULL,
	"guest_name" text,
	"status" text DEFAULT 'vou presentear' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_share_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_share_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "gift_reservations_checklist_item_unique" ON "gift_reservations" USING btree ("checklist_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_share_links_active_user_unique" ON "gift_share_links" USING btree ("user_id") WHERE "gift_share_links"."revoked_at" is null;