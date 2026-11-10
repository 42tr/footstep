ALTER TABLE `media` ADD `content_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `media_child_content_hash_idx` ON `media` (`child_id`,`content_hash`);