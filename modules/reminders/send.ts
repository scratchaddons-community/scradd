import { client } from "strife.js";
import {
	BUMPING_THREAD,
	COMMAND_ID,
	type Reminder,
	SpecialReminders,
	remindersDatabase,
} from "./misc.js";
import getWeekly, { getChatters } from "../xp/weekly.js";
import { convertBase, nth } from "../../util/numbers.js";
import {
	ChannelType,
	MessageFlags,
	TimestampStyles,
	chatInputApplicationCommandMention,
	time,
	userMention,
	ActivityType,
} from "discord.js";
import constants from "../../common/constants.js";
import { backupDatabases, cleanDatabaseListeners } from "../../common/database.js";
import config from "../../common/config.js";
import { gracefulFetch } from "../../util/promises.js";
import { syncRandomBoard } from "../board/update.js";

let nextReminder: NodeJS.Timeout | undefined;
export default async function queueReminders(): Promise<NodeJS.Timeout | undefined> {
	if (nextReminder) clearTimeout(nextReminder);

	const interval = getNextInterval();
	if (interval === undefined) return;

	if (interval < 100) {
		return await sendReminders();
	} else {
		nextReminder = setTimeout(sendReminders, interval);
		return nextReminder;
	}
}

const STATUSES = [
	"Watching the SA server!",
	"Hope for no bugs…",
	"Dating Callum",
	"e",
	"Moderating Scratch Addons",
	"Hi, I’m Scradd!",
	"Rico, status",
	"Scanning potatoes",
	"Try /addon!",
	"beep boop beep",
	"ims scradd",
	"alan 👑",
	"strawberries 😌",
].toSorted(() => Math.random() - 0.5);

async function sendReminders(): Promise<NodeJS.Timeout | undefined> {
	if (nextReminder) clearTimeout(nextReminder);

	const { toSend, toPostpone } = remindersDatabase.data.reduce<{
		toSend: Reminder[];
		toPostpone: Reminder[];
	}>(
		(accumulator, reminder) => {
			accumulator[reminder.date - Date.now() < 500 ? "toSend" : "toPostpone"].push(reminder);
			return accumulator;
		},
		{ toSend: [], toPostpone: [] },
	);
	remindersDatabase.data = toPostpone;

	for (const reminder of toSend) {
		const channel = await client.channels.fetch(reminder.channel).catch(() => void 0);
		if (reminder.user === client.user.id) {
			switch (reminder.id) {
				case SpecialReminders.Weekly: {
					if (!channel?.isTextBased()) continue;

					const date = new Date();
					date.setUTCDate(date.getUTCDate() - 7);
					const nextWeeklyDate = new Date(reminder.date);
					nextWeeklyDate.setUTCDate(nextWeeklyDate.getUTCDate() + 7);

					const chatters = await getChatters();
					const message = await channel.send(await getWeekly(nextWeeklyDate));
					if (!chatters) continue;
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
						} ${nth(date.getUTCDate())}`,
						reason: "To send all chatters",
					});
					await thread.send(chatters);
					continue;
				}
				case SpecialReminders.UpdateSACategory: {
					if (channel?.type !== ChannelType.GuildCategory) continue;

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

					const count = await gracefulFetch<{ count: number; _chromeCountDate: string }>(
						`${constants.urls.usercountJson}?date=${Date.now()}`,
					);
					if (!count) continue;

					await channel.setName(
						`Scratch Addons - ${count.count.toLocaleString([], {
							compactDisplay: "short",
							maximumFractionDigits: 1,
							minimumFractionDigits: +(count.count > 999),
							notation: "compact",
						})} users`,
						"Automated update to sync count",
					);
					continue;
				}
				case SpecialReminders.Bump: {
					if (!channel?.isTextBased()) continue;

					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: BUMPING_THREAD,
							date: Date.now() + 1_800_000,
							reminder: undefined,
							id: SpecialReminders.Bump,
							user: client.user.id,
						},
					];

					await channel.send({
						content: `🔔 @here ${chatInputApplicationCommandMention(
							"bump",
							COMMAND_ID,
						)} the server!`,
						allowedMentions: { parse: ["everyone"] },
					});
					continue;
				}
				case SpecialReminders.RebootBot: {
					await cleanDatabaseListeners();
					process.emitWarning(`${client.user.tag} is killing the bot`);
					process.exit(1);
					// Fake “fall-through” since ESLint doesn’t realize this is unreacahble
				}
				case SpecialReminders.CloseThread: {
					if (channel?.isThread()) await channel.setArchived(true, "Close requested");
					continue;
				}
				case SpecialReminders.LockThread: {
					if (channel?.isThread()) await channel.setLocked(true, "Lock requested");
					continue;
				}
				case SpecialReminders.Unban: {
					if (typeof reminder.reminder == "string")
						await config.guild.bans.remove(
							reminder.reminder,
							"Unbanned after set time period",
						);
					continue;
				}
				case SpecialReminders.BackupDatabases: {
					if (!channel?.isTextBased()) continue;

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

					await backupDatabases(channel);
					continue;
				}
				case SpecialReminders.SyncRandomBoard: {
					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: reminder.channel,
							date: Date.now() + ((Math.random() * 10) / 5 + 0.5) * 60 * 60 * 1000,
							id: SpecialReminders.SyncRandomBoard,
							user: client.user.id,
						},
					];

					await syncRandomBoard();
					continue;
				}
				case SpecialReminders.ChangeStatus: {
					const next = (Number(reminder.reminder) + 1) % STATUSES.length;

					remindersDatabase.data = [
						...remindersDatabase.data,
						{
							channel: "0",
							date: Date.now() + (Math.random() * 3 + 3) * 3_600_000,
							reminder: next,
							id: SpecialReminders.ChangeStatus,
							user: client.user.id,
						},
					];

					client.user.setActivity({
						type: ActivityType.Custom,
						name: "status",
						state: STATUSES[next],
					});
					continue;
				}
			}
		}
		if (!channel?.isTextBased() || typeof reminder.reminder !== "string") continue;
		const silent = reminder.reminder.startsWith("@silent");
		const content = silent ? reminder.reminder.replace("@silent", "") : reminder.reminder;
		await channel
			.send({
				content: `🔔 ${
					channel.isDMBased() ? "" : userMention(reminder.user) + " "
				}${content.trim()} (from ${time(
					new Date(+convertBase(reminder.id + "", convertBase.MAX_BASE, 10)),
					TimestampStyles.RelativeTime,
				)})`,
				allowedMentions: { users: [reminder.user] },
				flags: silent ? MessageFlags.SuppressNotifications : undefined,
			})
			.catch(() => void 0);
	}

	return await queueReminders();
}

function getNextInterval() {
	const [reminder] = remindersDatabase.data.toSorted((one, two) => one.date - two.date);
	if (!reminder) return;
	return reminder.date - Date.now();
}

await queueReminders();
