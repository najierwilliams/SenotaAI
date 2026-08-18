ALTER TABLE `agent_tasks` ADD `schedule_id` int;--> statement-breakpoint
CREATE INDEX `agent_tasks_schedule_created_idx` ON `agent_tasks` (`schedule_id`,`created_at`);