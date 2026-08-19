CREATE TABLE `workspace_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspace_id` varchar(96) NOT NULL,
	`client_memory_id` varchar(100) NOT NULL,
	`project_key` varchar(128) NOT NULL DEFAULT 'senota-ai',
	`source` varchar(32) NOT NULL DEFAULT 'device-sync',
	`category` varchar(48) NOT NULL,
	`content` text NOT NULL,
	`importance` int NOT NULL DEFAULT 3,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `workspace_memories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `workspace_memories_scope_idx` ON `workspace_memories` (`workspace_id`,`project_key`,`is_active`);--> statement-breakpoint
CREATE INDEX `workspace_memories_client_idx` ON `workspace_memories` (`workspace_id`,`client_memory_id`);