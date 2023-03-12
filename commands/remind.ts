import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	Snowflake,
	time,
	TimestampStyles,
} from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import Database from "../common/database.js";
import censor, { badWordsAllowed } from "../common/language.js";
import warn from "../common/punishments.js";
import { defineCommand } from "../common/types/command.js";
import { getWeekly } from "../common/xp.js";
import { disableComponents } from "../util/discord.js";

type Reminder = {
	channel: Snowflake;
	date: number;
	reminder: string | SpecialReminders;
	user: Snowflake;
	setAt: number;
};
export const remindersDatabase = new Database<Reminder>("reminders");
await remindersDatabase.init();

const command = defineCommand({
	data: {
		description: "Sets a reminder",
		censored: false,
		options: {
			dms: {
				type: ApplicationCommandOptionType.Boolean,
				description: "Whether to send the reminder in DMs instead of the current channel (defaults to true)",
			},
			time: {
				type: ApplicationCommandOptionType.String,
				required: true,
				description:
					"How long until the reminder should be sent, or a UNIX timestamp to send it at (within one minute)",
			},
			reminder: {
				type: ApplicationCommandOptionType.String,
				required: true,
				description: "Reminder to send",
				maxLength: 125,
			},
		},
	},

	async interaction(interaction) {
		const dms = interaction.options.getBoolean("dms") ?? true;
		const reminder = interaction.options.getString("reminder", true);

		if (!dms && !badWordsAllowed(interaction.channel)) {
			const censored = censor(reminder);

			if (censored) {
				await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} Language!`,
				});
				await warn(
					interaction.user,
					"Watch your language!",
					censored.strikes,
					`Used command:\n${interaction.toString()}`,
				);
				return;
			}
		}

		if (
			remindersDatabase.data.filter((reminder) => reminder.user === interaction.user.id)
				.length > 19
		) {
			return await interaction.reply({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} You already have 20 reminders set! You are not allowed to set any more currently.`,
			});
		}

		const date = parseTime(interaction.options.getString("time", true));
		if (+date < Date.now() + 60_000 || +date > Date.now() + 31_536_000_000) {
			return await interaction.reply({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t remind you sooner than 1 minute or later than 365 days.`,
			});
		}

		const channel = dms
			? (await interaction.user.createDM().catch(() => {}))?.id
			: interaction.channel?.id;
		if (!channel)
			return await interaction.reply({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} Your DMs are closed, so I can’t remind you!`,
			});

		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel,
				date: +date,
				reminder,
				user: interaction.user.id,
				setAt: Date.now(),
			},
		];

		await interaction.reply({
			ephemeral: dms,
			content: `${CONSTANTS.emojis.statuses.yes} I’ll remind you ${time(
				date,
				TimestampStyles.RelativeTime,
			)}!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Cancel Reminder",
							customId: `_cancelReminder`,
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	},
	buttons: {
		async cancelReminder(interaction) {
			if (
				interaction.user.id !== interaction.message.interaction?.user.id &&
				(!CONSTANTS.roles.mod ||
					!(interaction.member instanceof GuildMember
						? interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
						: interaction.member?.roles.includes(CONSTANTS.roles.mod.id)))
			)
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to cancel this reminder!`,
				});

			const { found, others } = remindersDatabase.data.reduce<{
				found: Reminder[];
				others: Reminder[];
			}>(
				({ found, others }, reminder) => {
					if (
						reminder.user === interaction.message.interaction?.user.id &&
						interaction.message.content.includes(
							`:${Math.floor(reminder.date / 1000)}:`,
						)
					)
						found.push(reminder);
					else others.push(reminder);

					return { found, others: others };
				},
				{ found: [], others: [] },
			);

			if (!found.length) {
				await interaction.message.edit({
					components: disableComponents(interaction.message.components),
				});
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} That reminder has already passed!`,
				});
			}

			remindersDatabase.data = others;

			await interaction.message.edit({
				content: `~~${interaction.message.content}~~\n${
					CONSTANTS.emojis.statuses.no
				} Reminder canceled${
					interaction.user.id === interaction.message.interaction?.user.id
						? ""
						: " by a mod"
				}.`,
				components: disableComponents(interaction.message.components),
			});
			await interaction.deferUpdate();
		},
	},
});
export default command;

function parseTime(time: string): Date {
	const number = Number(time);

	if (!isNaN(number)) {
		if (number > 1_000_000_000_000) return new Date(number);
		else if (number > 1_000_000_000) return new Date(number * 1_000);
		else return new Date(Date.now() + number * 3_600_000);
	}

	const {
		weeks = 0,
		days = 0,
		hours = 0,
		minutes = 0,
	} = time.match(
		new RegExp(
			/^(?:(?<weeks>\d+(?:.\d+)?)w(?:(?:ee)?ks?)?\s*)?/.source +
				/(?:(?<days>\d+(?:.\d+)?)d(?:ays?)?\s*)?/.source +
				/(?:(?<hours>\d+(?:.\d+)?)h(?:(?:ou)?rs?)?\s*)?/.source +
				/(?:(?<minutes>\d+(?:.\d+)?)m(?:in(?:ute)?s?)?)?$/.source,
		),
	)?.groups ?? {};

	const totalDays = Number(days) + 7 * Number(weeks);
	const totalHours = Number(hours) + 24 * totalDays;
	const totalMinutes = Number(minutes) + 60 * totalHours;
	const totalSeconds = 60 * totalMinutes;
	const totalMilliseconds = Date.now() + 1_000 * totalSeconds;
	return new Date(totalMilliseconds);
}

setInterval(async () => {
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

	await Promise.all(
		toSend.map(async (reminder) => {
			const channel = await client.channels.fetch(reminder.channel).catch(() => {});
			if (reminder.user === client.user.id) {
				switch (Number(reminder.reminder)) {
					case SpecialReminders.Weekly: {
						if (!channel?.isTextBased())
							throw new TypeError("Could not find weekly channel");

						const nextWeeklyDate = new Date(reminder.date);
						nextWeeklyDate.setUTCDate(nextWeeklyDate.getUTCDate() + 7);

						return await channel.send(await getWeekly(nextWeeklyDate));
					}
					case SpecialReminders.UpdateSACategory: {
						if (channel?.type !== ChannelType.GuildCategory)
							throw new TypeError("Could not find SA channel");

						const count = await fetch(
							`${CONSTANTS.urls.usercountJson}?date=${Date.now()}`,
						).then(
							async (response) =>
								await response?.json<{
									count: number;
									_chromeCountDate: string;
								}>(),
						);

						return await channel?.setName(
							`Scratch Addons - ${count.count.toLocaleString([], {
								compactDisplay: "short",
								maximumFractionDigits: 1,
								minimumFractionDigits: count.count > 999 ? 1 : 0,
								notation: "compact",
							})} users`,
							"Automated update to sync count",
						);
					}
					case SpecialReminders.Bump: {
						if (!channel?.isTextBased())
							throw new TypeError("Could not find bumping channel");
						return await channel.send({
							content: `🔔 @here </bump:947088344167366698> the server! (from ${time(
								new Date(reminder.setAt),
								TimestampStyles.RelativeTime,
							)})`,
							allowedMentions: { parse: ["everyone"] },
						});
					}
				}
			}
			if (!channel?.isTextBased()) return;
			await channel
				.send({
					content: `🔔 ${channel.isDMBased() ? "" : `<@${reminder.user}> `}${
						reminder.reminder
					} (from ${time(new Date(reminder.setAt), TimestampStyles.RelativeTime)})`,
					allowedMentions: { users: [reminder.user] },
				})
				.catch(() => {});
		}),
	);
}, 120_000);

export enum SpecialReminders {
	Weekly,
	UpdateSACategory,
	Bump,
}
