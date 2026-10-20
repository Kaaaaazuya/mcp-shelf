CREATE TABLE `ip_penalties` (
	`ip_hash` text PRIMARY KEY NOT NULL,
	`strikes` integer NOT NULL,
	`blocked_until` integer NOT NULL,
	`last_violation_at` integer NOT NULL
);
