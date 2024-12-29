import type { Channel } from "discord.js";
import type { Reminder } from "./misc.ts";

import { ActivityType, MessageFlags, time, TimestampStyles, userMention } from "discord.js";
import { client, logError } from "strife.js";

import config from "../../common/config.ts";
import { backupDatabases, prepareExit } from "../../common/database.ts";
import { statuses } from "../../common/strings.ts";
import { convertBase } from "../../util/numbers.ts";
import { syncRandomBoard } from "../board/update.ts";
import { LoggingEmojisError } from "../logging/util.ts";
import getWeekly, { getChatters } from "../xp/weekly.ts";
import { remindersDatabase, SpecialReminder } from "./misc.ts";

let nextReminder: NodeJS.Timeout | undefined;
export default async function queueReminders(): Promise<NodeJS.Timeout | undefined> {
	if (nextReminder) clearTimeout(nextReminder);

	const interval = getNextInterval();
	if (interval === undefined) return;

	if (interval < 100) return await sendReminders();

	nextReminder = setTimeout(sendReminders, interval);
	return nextReminder;
}

async function sendReminders(): Promise<NodeJS.Timeout | undefined> {
	if (nextReminder) clearTimeout(nextReminder);

	const { toSend, toPostpone } = remindersDatabase.data.reduce<{
		toSend: Reminder[];
		toPostpone: Reminder[];
	}>(
		(accumulator, reminder) => {
			accumulator[
				reminder.date === "NaN" || reminder.date - Date.now() < 500 ?
					"toSend"
				:	"toPostpone"
			].push(reminder);
			return accumulator;
		},
		{ toSend: [], toPostpone: [] },
	);
	remindersDatabase.data = toPostpone;
	const timeout = await queueReminders();

	for (const reminder of toSend) {
		const channel =
			(await client.channels.fetch(reminder.channel).catch(() => void 0)) ?? undefined;
		const reminderText = reminder.reminder?.toString() ?? "";
		if (reminder.user === client.user.id && typeof reminder.id === "number") {
			await sendSpecialReminder({
				channel,
				id: reminder.id,
				date: reminder.date === "NaN" ? new Date() : new Date(reminder.date),
				reminder: reminderText,
			});
			continue;
		}

		if (!channel?.isSendable()) continue;

		const silent = reminderText.startsWith("@silent");

		const ping = channel.isDMBased() ? "" : `${userMention(reminder.user)} `;
		const content = (silent ? reminderText.replace("@silent", "") : reminderText).trim();
		const date = time(
			new Date(+convertBase(reminder.id.toString(), convertBase.MAX_BASE, 10)),
			TimestampStyles.RelativeTime,
		);

		try {
			await channel.send({
				content: `🔔 ${ping}${content} (from ${date})`,
				allowedMentions: { users: [reminder.user] },
				flags: silent ? MessageFlags.SuppressNotifications : undefined,
			});
		} catch {
			// Ignored error
		}
	}

	return timeout;
}

async function sendSpecialReminder(reminder: {
	channel: Channel | undefined;
	id: SpecialReminder;
	date: Date;
	reminder: string;
}): Promise<void> {
	switch (reminder.id) {
		case SpecialReminder.Weekly: {
			if (!reminder.channel?.isSendable()) break;

			reminder.date.setUTCDate(reminder.date.getUTCDate() - 7);
			const title = `🏆 Weekly Winners week of ${reminder.date.toLocaleString([], {
				month: "long",
				day: "numeric",
			})}`;

			const message = await reminder.channel.send(await getWeekly(reminder.date));
			if (message.crosspostable) await message.crosspost();

			const chatters = await getChatters();
			if (!chatters) break;

			const thread = await message.startThread({
				name: title,
				reason: "To send all chatters",
			});
			await thread.send(chatters);

			break;
		}
		case SpecialReminder.RebootBot: {
			process.emitWarning(`${client.user.tag} is killing the bot`);
			await prepareExit();
			process.exit(1);
			// Fake “fall-through” since ESLint doesn’t realize this is unreachable
		}
		case SpecialReminder.Unban: {
			if (typeof reminder.reminder === "string")
				await config.guild.bans
					.remove(reminder.reminder, "Unbanned after set time period")
					.catch(() => void 0);
			break;
		}
		case SpecialReminder.BackupDatabases: {
			if (!reminder.channel?.isSendable()) break;

			remindersDatabase.data = [
				...remindersDatabase.data,
				{
					channel: reminder.channel.id,
					date: Number(Date.now() + 86_400_000),
					reminder: undefined,
					id: SpecialReminder.BackupDatabases,
					user: client.user.id,
				},
			];

			await backupDatabases(reminder.channel);
			break;
		}
		case SpecialReminder.SyncRandomBoard: {
			remindersDatabase.data = [
				...remindersDatabase.data,
				{
					channel: reminder.channel?.id ?? "0",
					date: Date.now() + ((Math.random() * 10) / 5 + 0.5) * 60 * 60 * 1000,
					id: SpecialReminder.SyncRandomBoard,
					user: client.user.id,
				},
			];

			await syncRandomBoard();
			break;
		}
		case SpecialReminder.ChangeStatus: {
			const next = (Number(reminder.reminder) + 1) % statuses.length;

			remindersDatabase.data = [
				...remindersDatabase.data,
				{
					channel: reminder.channel?.id ?? "0",
					date: Date.now() + (Math.random() * 3 + 3) * 3_600_000,
					reminder: next,
					id: SpecialReminder.ChangeStatus,
					user: client.user.id,
				},
			];

			client.user.setActivity({
				type: ActivityType.Custom,
				name: "status",
				state: statuses[next],
			});
			break;
		}
		default: {
			throw new ReferenceError(
				`Unknown, possibly deprecated, special reminder type ${reminder.id} used`,
			);
		}
	}
}

function getNextInterval(): number | undefined {
	const [reminder] = remindersDatabase.data.toSorted(
		(one, two) => (one.date === "NaN" ? 0 : one.date) - (two.date === "NaN" ? 0 : two.date),
	);
	if (!reminder) return;
	return reminder.date === "NaN" ? 0 : reminder.date - Date.now();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
queueReminders().catch((error) =>
	logError({
		error,
		channel: config.channels.errors,
		emoji: LoggingEmojisError,
		event: "queueReminders",
	}),
);
