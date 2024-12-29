import type { Snowflake } from "discord.js";

import { ChannelType } from "discord.js";
import { client } from "strife.js";

import config, { getInitialThreads } from "../../common/config.ts";
import constants from "../../common/constants.ts";
import Database from "../../common/database.ts";

export const enum SpecialReminder {
	Weekly,
	/** @deprecated */
	UpdateSACategory,
	/** @deprecated */
	Bump,
	RebootBot,
	/** @deprecated */
	CloseThread,
	/** @deprecated */
	LockThread,
	Unban,
	BackupDatabases,
	SyncRandomBoard,
	ChangeStatus,
	/** @deprecated */
	QOTD,
}
export type Reminder = {
	channel: Snowflake;
	date: number | "NaN";
	reminder?: number | string;
	user: Snowflake;
	id: SpecialReminder | string;
};

export const remindersDatabase = new Database<Reminder>("reminders");
await remindersDatabase.init();

export function getUserReminders(id: string): Reminder[] {
	return remindersDatabase.data
		.filter((reminder) => reminder.user === id)
		.toSorted(
			(one, two) => (one.date === "NaN" ? 0 : one.date) - (two.date === "NaN" ? 0 : two.date),
		);
}

const date = new Date();

if (
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminder.Weekly).length !== 1
)
	remindersDatabase.data = [
		...remindersDatabase.data.filter((reminder) => reminder.id !== SpecialReminder.Weekly),
		{
			channel: "1031406040148873297",
			date: +new Date(+date + ((7 - date.getUTCDay()) % 7) * 86_400_000).setUTCHours(
				0,
				0,
				0,
				0,
			),
			reminder: undefined,
			id: SpecialReminder.Weekly,
			user: client.user.id,
		},
	];

const backupsThread = getInitialThreads(config.channels.modlogs).find(
	(thread) => thread.type === ChannelType.PrivateThread && thread.name === "Database Backups",
);
if (backupsThread && constants.env === "production")
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) => reminder.id !== SpecialReminder.BackupDatabases,
		),
		{
			channel: backupsThread.id,
			date: +date,
			reminder: undefined,
			id: SpecialReminder.BackupDatabases,
			user: client.user.id,
		},
	];

if (config.channels.board)
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) => reminder.id !== SpecialReminder.SyncRandomBoard,
		),
		{
			channel: config.channels.board.id,
			date: +date,
			id: SpecialReminder.SyncRandomBoard,
			user: client.user.id,
		},
	];

remindersDatabase.data = [
	...remindersDatabase.data.filter((reminder) => reminder.id !== SpecialReminder.ChangeStatus),
	{
		channel: "0",
		date: +date,
		reminder: +0,
		id: SpecialReminder.ChangeStatus,
		user: client.user.id,
	},
];
