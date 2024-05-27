import type { Snowflake } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";

export enum SpecialReminders {
	Weekly,
	UpdateSACategory,
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
	id: SpecialReminders | string;
};

export const BUMPING_THREAD = "881619501018394725",
	BACKUPS_THREAD = "1138197530501460030",
	BUMP_COMMAND_ID = "947088344167366698";

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
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminders.Weekly).length !==
		1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter((reminder) => reminder.id !== SpecialReminders.Weekly),
		{
			channel: config.channels.announcements.id,
			date: +new Date(+date + ((7 - date.getUTCDay()) % 7) * 86_400_000).setUTCHours(
				0,
				0,
				0,
				0,
			),
			reminder: undefined,
			id: SpecialReminders.Weekly,
			user: client.user.id,
		},
	];
}

if (
	config.channels.suggestions?.parent &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminders.UpdateSACategory)
		.length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) => reminder.id !== SpecialReminders.UpdateSACategory,
		),
		{
			channel: config.channels.suggestions.parent.id,
			date: +date,
			reminder: undefined,
			id: SpecialReminders.UpdateSACategory,
			user: client.user.id,
		},
	];
}

if (
	process.env.NODE_ENV === "production" &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminders.Bump).length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter((reminder) => reminder.id !== SpecialReminders.Bump),
		{
			channel: BUMPING_THREAD,
			date: +date + 3_600_000,
			reminder: undefined,
			id: SpecialReminders.Bump,
			user: client.user.id,
		},
	];
}

if (
	process.env.NODE_ENV === "production" &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminders.BackupDatabases)
		.length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) => reminder.id !== SpecialReminders.BackupDatabases,
		),
		{
			channel: BACKUPS_THREAD,
			date: +date,
			reminder: undefined,
			id: SpecialReminders.BackupDatabases,
			user: client.user.id,
		},
	];
}

if (
	config.channels.board &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminders.SyncRandomBoard)
		.length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) => reminder.id !== SpecialReminders.SyncRandomBoard,
		),
		{
			channel: config.channels.board.id,
			date: +date,
			id: SpecialReminders.SyncRandomBoard,
			user: client.user.id,
		},
	];
}

if (
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminders.ChangeStatus)
		.length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter(
			(reminder) => reminder.id !== SpecialReminders.ChangeStatus,
		),
		{
			channel: "0",
			date: +date,
			reminder: +0,
			id: SpecialReminders.ChangeStatus,
			user: client.user.id,
		},
	];
}

if (
	config.channels.qotd &&
	remindersDatabase.data.filter((reminder) => reminder.id === SpecialReminders.QOTD).length !== 1
) {
	remindersDatabase.data = [
		...remindersDatabase.data.filter((reminder) => reminder.id !== SpecialReminders.QOTD),
		{
			channel: config.channels.qotd.id,
			date: date.setUTCHours(12, 0, 0, 0) + (date.getUTCHours() >= 12 ? 86_400_000 : 0),
			reminder: undefined,
			id: SpecialReminders.QOTD,
			user: client.user.id,
		},
	];
}
