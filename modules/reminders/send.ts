import { client } from "strife.js";
import {
	remindersDatabase,
	type Reminder,
	SpecialReminders,
	BUMPING_THREAD,
	COMMAND_ID,
} from "./misc.js";
import getWeekly, { getChatters } from "../xp/weekly.js";
import { convertBase, nth } from "../../util/numbers.js";
import { ChannelType, MessageFlags, TimestampStyles, time } from "discord.js";
import constants from "../../common/constants.js";
import { backupDatabases, cleanDatabaseListeners } from "../../common/database.js";
import config from "../../common/config.js";

let nextReminder: NodeJS.Timeout | undefined;
export default async function queueReminders(): Promise<undefined | NodeJS.Timeout> {
	if (nextReminder) clearTimeout(nextReminder);

	const interval = getNextInterval();
	if (interval === undefined) return;

	if (interval < 30_000) {
		return await sendReminders();
	} else {
		nextReminder = setTimeout(sendReminders, interval);
		return nextReminder;
	}
}

async function sendReminders(): Promise<undefined | NodeJS.Timeout> {
	if (nextReminder) clearTimeout(nextReminder);

	const { toSend, toPostpone } = remindersDatabase.data.reduce<{
		toSend: Reminder[];
		toPostpone: Reminder[];
	}>(
		(acc, reminder) => {
			acc[reminder.date - Date.now() < 60_000 ? "toSend" : "toPostpone"].push(reminder);
			return acc;
		},
		{ toSend: [], toPostpone: [] },
	);
	remindersDatabase.data = toPostpone;

	const promises = toSend.map(async (reminder) => {
		const channel = await client.channels.fetch(reminder.channel).catch(() => {});
		if (reminder.user === client.user.id) {
			switch (reminder.id) {
				case SpecialReminders.Weekly: {
					if (!channel?.isTextBased()) return;

					const date = new Date();
					date.setUTCDate(date.getUTCDate() - 7);
					const nextWeeklyDate = new Date(reminder.date);
					nextWeeklyDate.setUTCDate(nextWeeklyDate.getUTCDate() + 7);

					const chatters = await getChatters();
					const message = await channel.send(await getWeekly(nextWeeklyDate));
					if (!chatters) return message;
					const thread = await message.startThread({
						name: `🏆 Weekly Winners week of ${
							[
								"January",
								"February",
								"March",
								"April",
								"May",
								"June",
								"July",
								"August",
								"September",
								"October",
								"November",
								"December",
							][date.getUTCMonth()] || ""
						} ${nth(date.getUTCDate(), { bold: false, jokes: false })}`,
						reason: "To send all chatters",
					});
					await thread.send(chatters);
					return message;
				}
				case SpecialReminders.UpdateSACategory: {
					if (channel?.type !== ChannelType.GuildCategory) return;

					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: reminder.channel,
							date: Number(Date.now() + 3_600_000),
							reminder: undefined,
							id: SpecialReminders.UpdateSACategory,
							user: client.user.id,
						},
					];

					const count = await fetch(
						`${constants.urls.usercountJson}?date=${Date.now()}`,
					).then(
						async (response) =>
							await response?.json<{ count: number; _chromeCountDate: string }>(),
					);

					return await channel?.setName(
						`Scratch Addons - ${count.count.toLocaleString("en-us", {
							compactDisplay: "short",
							maximumFractionDigits: 1,
							minimumFractionDigits: +(count.count > 999),
							notation: "compact",
						})} users`,
						"Automated update to sync count",
					);
				}
				case SpecialReminders.Bump: {
					if (!channel?.isTextBased()) return;

					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: BUMPING_THREAD,
							date: Date.now() + 1800000,
							reminder: undefined,
							id: SpecialReminders.Bump,
							user: client.user.id,
						},
					];

					return await channel.send({
						content: `🔔 @here </bump:${COMMAND_ID}> the server!`,
						allowedMentions: { parse: ["everyone"] },
					});
				}
				case SpecialReminders.RebootBot: {
					await cleanDatabaseListeners();
					process.emitWarning(`${client.user.tag} is killing the bot`);
					process.exit(1);
				}
				case SpecialReminders.CloseThread: {
					if (channel?.isThread()) await channel.setArchived(true, "Close requested");
					return;
				}
				case SpecialReminders.LockThread: {
					if (channel?.isThread()) await channel.setLocked(true, "Lock requested");
					return;
				}
				case SpecialReminders.Unban: {
					await config.guild.bans.remove(
						String(reminder.reminder),
						"Unbanned after set time period",
					);
					return;
				}
				case SpecialReminders.BackupDatabases: {
					if (!channel?.isTextBased()) return;

					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: reminder.channel,
							date: Number(Date.now() + 86_400_000),
							reminder: undefined,
							id: SpecialReminders.BackupDatabases,
							user: client.user.id,
						},
					];

					return backupDatabases(channel);
				}
			}
		}
		if (!channel?.isTextBased() || typeof reminder.reminder !== "string") return;
		const silent = reminder.reminder.startsWith("@silent");
		const content = silent ? reminder.reminder.replace("@silent", "") : reminder.reminder;
		await channel
			.send({
				content: `🔔 ${
					channel.isDMBased() ? "" : `<@${reminder.user}> `
				}${content.trim()} (from ${time(
					new Date(+convertBase(reminder.id + "", convertBase.MAX_BASE, 10)),
					TimestampStyles.RelativeTime,
				)})`,
				allowedMentions: { users: [reminder.user] },
				flags: silent ? MessageFlags.SuppressNotifications : undefined,
			})
			.catch(() => {});
	});
	await Promise.all(promises);

	return await queueReminders();
}

function getNextInterval() {
	const reminder = [...remindersDatabase.data].sort((one, two) => one.date - two.date)[0];
	if (!reminder) return;
	return reminder.date - Date.now();
}
