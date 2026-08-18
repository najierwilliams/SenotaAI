CREATE TABLE `agent_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`step_id` int,
	`action_type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`status` enum('requested','approved','rejected','expired') NOT NULL DEFAULT 'requested',
	`resolved_by_user_id` int,
	`requested_at` bigint NOT NULL,
	`resolved_at` bigint,
	CONSTRAINT `agent_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`source_task_id` int,
	`category` varchar(48) NOT NULL,
	`content` text NOT NULL,
	`importance` int NOT NULL DEFAULT 3,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `agent_memories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`task_id` int,
	`kind` varchar(48) NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`created_at` bigint NOT NULL,
	`delivered_at` bigint,
	CONSTRAINT `agent_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`goal` text NOT NULL,
	`cron_expression` varchar(64) NOT NULL,
	`model` varchar(128) NOT NULL,
	`execution_mode` enum('confirm','auto') NOT NULL DEFAULT 'confirm',
	`status` enum('active','paused','failed') NOT NULL DEFAULT 'active',
	`schedule_cron_task_uid` varchar(65),
	`last_run_at` bigint,
	`next_run_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `agent_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_schedules_schedule_cron_task_uid_unique` UNIQUE(`schedule_cron_task_uid`)
);
--> statement-breakpoint
CREATE TABLE `agent_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`default_model` varchar(128) NOT NULL DEFAULT 'llama3',
	`default_execution_mode` enum('confirm','auto') NOT NULL DEFAULT 'confirm',
	`default_max_retries` int NOT NULL DEFAULT 2,
	`github_repository` varchar(256) NOT NULL DEFAULT 'najierwilliams/SenotaAI',
	`vercel_project` varchar(128),
	`notifications_enabled` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `agent_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_settings_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `agent_steps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` int NOT NULL,
	`sequence` int NOT NULL,
	`kind` varchar(48) NOT NULL,
	`status` enum('pending','running','completed','failed','skipped') NOT NULL DEFAULT 'pending',
	`title` varchar(255) NOT NULL,
	`detail` text,
	`payload` json,
	`started_at` bigint,
	`finished_at` bigint,
	`created_at` bigint NOT NULL,
	CONSTRAINT `agent_steps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`goal` text NOT NULL,
	`repository` varchar(256) NOT NULL DEFAULT 'najierwilliams/SenotaAI',
	`model` varchar(128) NOT NULL,
	`status` enum('queued','planning','running','awaiting_approval','paused','cancelled','completed','failed') NOT NULL DEFAULT 'queued',
	`execution_mode` enum('confirm','auto') NOT NULL DEFAULT 'confirm',
	`current_phase` varchar(128),
	`final_summary` text,
	`error_message` text,
	`retry_count` int NOT NULL DEFAULT 0,
	`cancel_requested` boolean NOT NULL DEFAULT false,
	`pause_requested` boolean NOT NULL DEFAULT false,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`started_at` bigint,
	`finished_at` bigint,
	CONSTRAINT `agent_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `agent_approvals_task_status_idx` ON `agent_approvals` (`task_id`,`status`);--> statement-breakpoint
CREATE INDEX `agent_memories_user_active_idx` ON `agent_memories` (`user_id`,`is_active`);--> statement-breakpoint
CREATE INDEX `agent_notifications_user_created_idx` ON `agent_notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `agent_schedules_user_status_idx` ON `agent_schedules` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `agent_steps_task_sequence_idx` ON `agent_steps` (`task_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `agent_tasks_user_created_idx` ON `agent_tasks` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `agent_tasks_user_status_idx` ON `agent_tasks` (`user_id`,`status`);