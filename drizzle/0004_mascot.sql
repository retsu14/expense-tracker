CREATE TABLE "pig_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"best_balance" bigint DEFAULT 0 NOT NULL,
	"outfit" text,
	"celebrated" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pig_progress" ADD CONSTRAINT "pig_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;