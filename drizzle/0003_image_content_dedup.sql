ALTER TABLE `media` ADD `image_hash` text;--> statement-breakpoint
CREATE UNIQUE INDEX `media_child_image_hash_idx` ON `media` (`child_id`,`image_hash`);
