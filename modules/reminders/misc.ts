import type { Snowflake } from "discord.js";
import Database from "../../common/database.js";
import config from "../../common/config.js";
import { client } from "strife.js";

export enum SpecialReminders {
	Weekly,
	UpdateSACategory,
	Bump,
	RebootBot,
	CloseThread,
	LockThread,
	Unban,
	BackupDatabases,
	SyncRandomPotato,
}
export type Reminder = {
	channel: Snowflake;
	date: number;
	reminder?: string | number;
	user: Snowflake;
	id: string | SpecialReminders;
};

export const BUMPING_THREAD = "881619501018394725",
	BACKUPS_THREAD = "1138197530501460030",
	COMMAND_ID = "947088344167366698";

export const remindersDatabase = new Database<Reminder>("reminders");
await remindersDatabase.init();

export function getUserReminders(id: string) {
	return remindersDatabase.data
		.filter((reminder) => reminder.user === id)
		.sort((one, two) => one.date - two.date);
}

if (!remindersDatabase.data.some((reminder) => reminder.id === SpecialReminders.Weekly)) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: config.channels.announcements?.id ?? "",
			date: Date.now() + 302_400_000,
			reminder: undefined,
			id: SpecialReminders.Weekly,
			user: client.user.id,
		},
	];
}

if (!remindersDatabase.data.some((reminder) => reminder.id === SpecialReminders.UpdateSACategory)) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: config.channels.suggestions?.parent?.id ?? "",
			date: Date.now(),
			reminder: undefined,
			id: SpecialReminders.UpdateSACategory,
			user: client.user.id,
		},
	];
}

if (
	!remindersDatabase.data.some((reminder) => reminder.id === SpecialReminders.Bump) &&
	process.env.NODE_ENV === "production"
) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: BUMPING_THREAD,
			date: Date.now() + 3_600_000,
			reminder: undefined,
			id: SpecialReminders.Bump,
			user: client.user.id,
		},
	];
}

if (
	!remindersDatabase.data.some((reminder) => reminder.id === SpecialReminders.BackupDatabases) &&
	process.env.NODE_ENV === "production"
) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: BACKUPS_THREAD,
			date: Date.now(),
			reminder: undefined,
			id: SpecialReminders.BackupDatabases,
			user: client.user.id,
		},
	];
}

if (!remindersDatabase.data.some((reminder) => reminder.id === SpecialReminders.SyncRandomPotato)) {
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: config.channels.board?.id ?? "",
			date: Date.now(),
			id: SpecialReminders.SyncRandomPotato,
			user: client.user.id,
		},
	];
}
