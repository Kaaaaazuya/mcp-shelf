CREATE TABLE `call_counts` (
	`day` text NOT NULL,
	`tool` text NOT NULL,
	`slug` text DEFAULT '' NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`day`, `tool`, `slug`)
);
