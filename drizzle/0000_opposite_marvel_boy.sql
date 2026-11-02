CREATE TABLE `children` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`birth_date` text NOT NULL,
	`birth_time` text DEFAULT '' NOT NULL,
	`sex` text DEFAULT 'unknown' NOT NULL,
	`avatar_key` text,
	`bio` text DEFAULT '' NOT NULL,
	`birth_weight_kg` real,
	`birth_height_cm` real,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `firsts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`preset_key` text DEFAULT '' NOT NULL,
	`label` text NOT NULL,
	`emoji` text DEFAULT '🌱' NOT NULL,
	`achieved_on` text,
	`age_days` integer,
	`note` text DEFAULT '' NOT NULL,
	`media_id` integer,
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `firsts_child_idx` ON `firsts` (`child_id`);--> statement-breakpoint
CREATE TABLE `growth` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`recorded_on` text NOT NULL,
	`height_cm` real,
	`weight_kg` real,
	`head_cm` real,
	`note` text DEFAULT '' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `growth_child_idx` ON `growth` (`child_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`kind` text NOT NULL,
	`file_key` text NOT NULL,
	`thumb_key` text,
	`mime` text DEFAULT '' NOT NULL,
	`bytes` integer DEFAULT 0 NOT NULL,
	`width` integer,
	`height` integer,
	`duration_ms` integer,
	`taken_at` text,
	`caption` text DEFAULT '' NOT NULL,
	`album` text DEFAULT '' NOT NULL,
	`favorite` integer DEFAULT false NOT NULL,
	`uploaded_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `media_child_idx` ON `media` (`child_id`);--> statement-breakpoint
CREATE INDEX `media_taken_idx` ON `media` (`taken_at`);--> statement-breakpoint
CREATE TABLE `members` (
	`user_id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`role` text DEFAULT '家人' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `moments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`child_id` integer NOT NULL,
	`happened_on` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`category` text DEFAULT 'daily' NOT NULL,
	`media_ids` text DEFAULT '[]' NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `moments_child_idx` ON `moments` (`child_id`);