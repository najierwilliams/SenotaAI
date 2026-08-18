CREATE TABLE `owner_access` (
	`id` int AUTO_INCREMENT NOT NULL,
	`instance_key` varchar(32) NOT NULL,
	`user_id` int NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`session_version` int NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `owner_access_id` PRIMARY KEY(`id`),
	CONSTRAINT `owner_access_instance_key_unique` UNIQUE(`instance_key`),
	CONSTRAINT `owner_access_user_id_unique` UNIQUE(`user_id`)
);
