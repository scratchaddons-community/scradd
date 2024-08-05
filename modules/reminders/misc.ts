import { ChannelType, type Snowflake } from "discord.js";
import { client } from "strife.js";
import config, { getInitialThreads } from "../../common/config.js";
import Database from "../../common/database.js";

export enum SpecialReminder {
	Weekly,
	UpdateSACategory,
	/** @deprecated */
	Bump,
	RebootBot,
	CloseThread,
	LockThread,
	Unban,
	BackupDatabases,
	SyncRandomBoard,
	ChangeStatus,
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
	config.channels.announcements &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminder.Weekly).length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter((reminder) => reminder.id !== SpecialReminder.Weekly),
		{
			channel: config.channels.announcements.id,
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
}

if (
	config.channels.suggestions?.parent &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminder.UpdateSACategory)
		.length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) => reminder.id !== SpecialReminder.UpdateSACategory,
		),
		{
			channel: config.channels.suggestions.parent.id,
			date: +date,
			reminder: undefined,
			id: SpecialReminder.UpdateSACategory,
			user: client.user.id,
		},
	];
}

const backupsThread = getInitialThreads(config.channels.modlogs).find(
	(thread) => thread.type === ChannelType.PrivateThread && thread.name === "Database Backups",
);
if (backupsThread && process.env.NODE_ENV === "production") {
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
}

if (config.channels.board) {
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
}

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

if (
	config.channels.qotd &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminder.QOTD).length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter((reminder) => reminder.id !== SpecialReminder.QOTD),
		{
			channel: config.channels.qotd.id,
			date: date.setUTCHours(12, 0, 0, 0) + (date.getUTCHours() >= 12 ? 86_400_000 : 0),
			reminder: undefined,
			id: SpecialReminder.QOTD,
			user: client.user.id,
		},
	];
}
