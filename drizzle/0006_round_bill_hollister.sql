CREATE TABLE `npc_reflection_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`npc_id` varchar(128) NOT NULL,
	`status` enum('active','paused','failed') NOT NULL DEFAULT 'active',
	`time_zone` varchar(64) NOT NULL DEFAULT 'America/New_York',
	`daily_target` int NOT NULL DEFAULT 6,
	`runs_today` int NOT NULL DEFAULT 0,
	`day_key` varchar(10),
	`schedule_cron_task_uid` varchar(65),
	`next_eligible_at` bigint,
	`last_run_at` bigint,
	`last_reflection_id` varchar(64),
	`last_error` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `npc_reflection_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `npc_reflection_schedules_npc_id_unique` UNIQUE(`npc_id`),
	CONSTRAINT `npc_reflection_schedules_schedule_cron_task_uid_unique` UNIQUE(`schedule_cron_task_uid`)
);
--> statement-breakpoint
CREATE INDEX `npc_reflection_schedules_status_idx` ON `npc_reflection_schedules` (`status`);