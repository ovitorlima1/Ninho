CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text,
	"due_date" text,
	"city" text,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"group" text DEFAULT '' NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'A comprar' NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"essential" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"week" integer NOT NULL,
	"title" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"category" text NOT NULL,
	"planned" numeric(10, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
