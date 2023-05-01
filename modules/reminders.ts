import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	MessageComponentInteraction,
	MessageFlags,
	Snowflake,
	time,
	TimestampStyles,
} from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import Database, { cleanDatabaseListeners } from "../common/database.js";
import censor, { badWordsAllowed } from "./automod/language.js";
import defineCommand from "../commands.js";
import { disableComponents } from "../util/discord.js";
import { convertBase } from "../util/numbers.js";
import { getSettings } from "./settings.js";
import { defineButton, defineSelect } from "../components.js";
import defineEvent from "../events.js";
import getWeekly from "./xp/weekly.js";
import warn from "./punishments/warn.js";

export enum SpecialReminders {
	Weekly,
	UpdateSACategory,
	Bump,
	RebootBot,
}
type Reminder = {
	channel: Snowflake;
	date: number;
	reminder?: string | number;
	user: Snowflake;
	id: string | SpecialReminders;
};
export const remindersDatabase = new Database<Reminder>("reminders");
await remindersDatabase.init();

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
				switch (Number(reminder.id)) {
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

						remindersDatabase.data = [
							...remindersDatabase.data,
							{
								channel: CONSTANTS.channels.info?.id || "",
								date: Number(Date.now() + 3_600_000),
								reminder: undefined,
								id: SpecialReminders.UpdateSACategory,
								user: client.user.id,
							},
						];

						const count = await fetch(
							`${CONSTANTS.urls.usercountJson}?date=${Date.now()}`,
						).then(
							async (response) =>
								await response?.json<{ count: number; _chromeCountDate: string }>(),
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
							content: "🔔 @here </bump:947088344167366698> the server!",
							allowedMentions: { parse: ["everyone"] },
						});
					}
					case SpecialReminders.RebootBot: {
						await cleanDatabaseListeners();
						process.emitWarning(`${client.user.tag} is killing the bot`);
						// eslint-disable-next-line unicorn/no-process-exit -- This is how you restart the process on Railway.
						process.exit(1);
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
		}),
	);
}, 120_000);

defineCommand(
	{
		name: "reminders",
		description: "Commands to manage reminders",
		censored: false,
		subcommands: {
			add: {
				description: "Sets a reminder",
				options: {
					dms: {
						type: ApplicationCommandOptionType.Boolean,
						description:
							"Send the reminder in DMs instead of this channel (defaults to true unless changed with /settings)",
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
			list: { description: "View your reminders" },
		},
	},
	async (interaction) => {
		const reminders = remindersDatabase.data
			.filter((reminder) => reminder.user === interaction.user.id)
			.sort((one, two) => one.date - two.date);
		if (interaction.options.getSubcommand(true) === "list") {
			if (!reminders.length)
				return await interaction.reply({
					ephemeral: true,
					content: `${CONSTANTS.emojis.statuses.no} You don’t have any reminders set!`,
				});

			return await interaction.reply({
				ephemeral: true,
				embeds: [
					{
						color:
							interaction.member instanceof GuildMember
								? interaction.member.displayColor
								: undefined,

						author: {
							icon_url: (interaction.member instanceof GuildMember
								? interaction.member
								: interaction.user
							).displayAvatarURL(),
							name:
								interaction.member instanceof GuildMember
									? interaction.member.displayName
									: interaction.user.username,
						},
						footer: {
							text: `${reminders.length} reminder${
								reminders.length === 1 ? "" : "s"
							}`,
						},
						description: reminders
							.map(
								(reminder) =>
									`\`${reminder.id}\`) ${time(
										new Date(reminder.date),
										TimestampStyles.RelativeTime,
									)}: <#${reminder.channel}> ${reminder.reminder}`,
							)
							.join("\n"),
					},
				],
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								customId: "_cancelReminder",
								type: ComponentType.StringSelect,
								placeholder: "Cancel Reminder",
								options: reminders.map((reminder) => ({
									value: reminder.id + "",
									description: `${reminder.reminder}`.slice(0, 100),
									label: reminder.id + "",
								})),
							},
						],
					},
				],
			});
		}
		const dms =
			interaction.options.getBoolean("dms") ?? getSettings(interaction.user).dmReminders;
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

		if (reminders.length > 19) {
			return await interaction.reply({
				ephemeral: true,
				content: `${CONSTANTS.emojis.statuses.no} You already have 20 reminders set! You are currently not allowed to set any more.`,
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

		const id = convertBase(Date.now() + "", 10, convertBase.MAX_BASE);
		remindersDatabase.data = [
			...remindersDatabase.data,
			{ channel, date: +date, reminder, user: interaction.user.id, id },
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
							customId: `${id}_cancelReminder`,
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	},
);
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
			/^(?:(?<weeks>\d+(?:.\d+)?)\s*w(?:(?:ee)?ks?)?\s*)?\s*/.source +
				/(?:(?<days>\d+(?:.\d+)?)\s*d(?:ays?)?\s*)?\s*/.source +
				/(?:(?<hours>\d+(?:.\d+)?)\s*h(?:(?:ou)?rs?)?\s*)?\s*/.source +
				/(?:(?<minutes>\d+)\s*m(?:in(?:ute)?s?)?)?$/.source,
		),
	)?.groups ?? {};

	const totalDays = Number(days) + 7 * Number(weeks);
	const totalHours = Number(hours) + 24 * totalDays;
	const totalMinutes = Number(minutes) + 60 * totalHours;
	const totalSeconds = 60 * totalMinutes;
	const totalMilliseconds = Date.now() + 1_000 * totalSeconds;
	return new Date(totalMilliseconds);
}

defineSelect("cancelReminder", async (interaction) => {
	const [id = ""] = interaction.values;
	const success = await cancelReminder(interaction, id);
	if (!success) return;

	await interaction.reply({
		content: `${CONSTANTS.emojis.statuses.yes} Reminder \`${id}\` canceled!`,
		ephemeral: true,
	});
});
defineButton("cancelReminder", async (interaction, id = "") => {
	const success = await cancelReminder(interaction, id);
	if (!success) return;

	if (interaction.message.flags.has("Ephemeral")) {
		await interaction.reply({
			content: `${CONSTANTS.emojis.statuses.yes} Reminder canceled!`,
			ephemeral: true,
		});
	} else {
		await interaction.message.edit({
			content: `~~${interaction.message.content}~~\n${
				CONSTANTS.emojis.statuses.no
			} Reminder canceled${
				interaction.user.id === interaction.message.interaction?.user.id ? "" : " by a mod"
			}.`,
			components: disableComponents(interaction.message.components),
		});
		await interaction.deferUpdate();
	}
});
async function cancelReminder(interaction: MessageComponentInteraction, id: string) {
	if (
		interaction.user.id !== interaction.message.interaction?.user.id &&
		(!CONSTANTS.roles.mod ||
			!(interaction.member instanceof GuildMember
				? interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
				: interaction.member?.roles.includes(CONSTANTS.roles.mod.id)))
	) {
		await interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to cancel this reminder!`,
		});
		return false;
	}

	const filtered = remindersDatabase.data.filter((reminder) => reminder.id !== id);

	if (filtered.length !== remindersDatabase.data.length - 1) {
		if (!interaction.message.flags.has("Ephemeral"))
			await interaction.message.edit({
				components: disableComponents(interaction.message.components),
			});
		await interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} Could not cancel that reminder. Has it already passed?`,
		});
		return false;
	}

	remindersDatabase.data = filtered;
	return true;
}

defineEvent("messageCreate", async (message) => {
	if (
		message.guild?.id === CONSTANTS.guild.id &&
		message.interaction?.commandName == "bump" &&
		message.author.id === "302050872383242240" &&
		!remindersDatabase.data.find(
			(reminder) => reminder.id === SpecialReminders.Bump && reminder.user === client.user.id,
		)
	) {
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: "881619501018394725",
				date: Date.now() + 7260000,
				reminder: undefined,
				id: SpecialReminders.Bump,
				user: client.user.id,
			},
		];
	}
});
