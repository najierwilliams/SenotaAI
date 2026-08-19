CREATE TABLE `npc_admin_audits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action` varchar(64) NOT NULL,
	`record_type` varchar(32) NOT NULL,
	`record_id` varchar(128) NOT NULL,
	`fields` json,
	`created_at` bigint NOT NULL,
	CONSTRAINT `npc_admin_audits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `npc_admin_audits_created_idx` ON `npc_admin_audits` (`created_at`);--> statement-breakpoint
CREATE INDEX `npc_admin_audits_record_idx` ON `npc_admin_audits` (`record_type`,`record_id`);