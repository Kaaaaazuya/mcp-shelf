CREATE TABLE `servers` (
	`slug` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`summary` text NOT NULL,
	`description` text NOT NULL,
	`transport` text NOT NULL,
	`language` text NOT NULL,
	`repo` text,
	`status` text NOT NULL,
	`config` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tools` (
	`server_slug` text NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`input_schema` text NOT NULL,
	PRIMARY KEY(`server_slug`, `name`),
	FOREIGN KEY (`server_slug`) REFERENCES `servers`(`slug`) ON UPDATE no action ON DELETE cascade
);
