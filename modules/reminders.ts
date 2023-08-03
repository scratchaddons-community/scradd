import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	MessageComponentInteraction,
	MessageFlags,
	type Snowflake,
	time,
	TimestampStyles,
} from "discord.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import Database, { cleanDatabaseListeners } from "../common/database.js";
import censor, { badWordsAllowed } from "./automod/language.js";
import { disableComponents } from "../util/discord.js";
import { convertBase, nth, parseTime } from "../util/numbers.js";
import { getSettings } from "./settings.js";
import { defineButton, defineSelect, client, defineCommand, defineEvent } from "strife.js";
import getWeekly, { getChatters } from "./xp/weekly.js";
import warn from "./punishments/warn.js";
import { getLevelForXp, xpDatabase } from "./xp/misc.js";

export enum SpecialReminders {
	Weekly,
	UpdateSACategory,
	Bump,
	RebootBot,
	CloseThread,
	LockThread,
	Unban,
}
type Reminder = {
	channel: Snowflake;
	date: number;
	reminder?: string | number;
	user: Snowflake;
	id: string | SpecialReminders;
};

const BUMPING_THREAD = "881619501018394725",
	COMMAND_ID = "947088344167366698";

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

	const promises = toSend.map(async (reminder) => {
		const channel = await client.channels.fetch(reminder.channel).catch(() => {});
		if (reminder.user === client.user.id) {
			switch (reminder.id) {
				case SpecialReminders.Weekly: {
					if (!channel?.isTextBased())
						throw new TypeError("Could not find weekly channel");

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
					if (channel?.type !== ChannelType.GuildCategory)
						throw new TypeError("Could not find SA channel");

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
					if (!channel?.isTextBased())
						throw new TypeError("Could not find bumping channel");

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
					// eslint-disable-next-line unicorn/no-process-exit -- This is how you restart the process on Railway.
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
							"How long until sending the reminder or a UNIX timestamp to send it at (within one minute)",
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
					content: `${constants.emojis.statuses.no} You don’t have any reminders set!`,
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
							name: (interaction.member instanceof GuildMember
								? interaction.member
								: interaction.user
							).displayName,
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
								placeholder: "Cancel",
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
					content: `${constants.emojis.statuses.no} ${
						censored.strikes < 1 ? "That's not appropriate" : "Language"
					}!`,
				});
				await warn(
					interaction.user,
					"Watch your language!",
					censored.strikes,
					`Used command ${interaction.toString()}`,
				);
				return;
			}
		}

		if (
			reminders.length >
			Math.ceil(
				getLevelForXp(
					Math.abs(
						xpDatabase.data.find(({ user }) => user === interaction.user.id)?.xp ?? 0,
					),
				) * 0.3,
			) +
				5
		) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} You already have ${reminders.length} reminders set! Please cancel some or level up before setting any more.`,
			});
		}

		const date = parseTime(interaction.options.getString("time", true).toLowerCase().trim());
		if (+date < Date.now() + 60_000 || +date > Date.now() + 31_536_000_000) {
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t remind you sooner than 1 minute or later than 365 days.`,
			});
		}

		const channel = dms
			? (await interaction.user.createDM().catch(() => {}))?.id
			: interaction.channel?.id;
		if (!channel)
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Your DMs are closed, so I can’t remind you!`,
			});

		const id = convertBase(Date.now() + "", 10, convertBase.MAX_BASE);
		remindersDatabase.data = [
			...remindersDatabase.data,
			{ channel, date: +date, reminder, user: interaction.user.id, id },
		];

		await interaction.reply({
			ephemeral: dms,
			content: `${constants.emojis.statuses.yes} I’ll remind you ${time(
				date,
				TimestampStyles.RelativeTime,
			)}!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Cancel",
							customId: `${id}_cancelReminder`,
							style: ButtonStyle.Danger,
						},
					],
				},
			],
		});
	},
);

defineSelect("cancelReminder", async (interaction) => {
	const [id = ""] = interaction.values;
	const success = await cancelReminder(interaction, id);
	if (!success) return;

	await interaction.reply({
		content: `${constants.emojis.statuses.yes} Reminder \`${id}\` canceled!`,
		ephemeral: true,
	});
});
defineButton("cancelReminder", async (interaction, id = "") => {
	const success = await cancelReminder(interaction, id);
	if (!success) return;

	if (interaction.message.flags.has("Ephemeral")) {
		await interaction.reply({
			content: `${constants.emojis.statuses.yes} Reminder canceled!`,
			ephemeral: true,
		});
	} else {
		await interaction.message.edit({
			content: `~~${interaction.message.content}~~\n${
				constants.emojis.statuses.no
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
		(!config.roles.mod ||
			!(interaction.member instanceof GuildMember
				? interaction.member.roles.resolve(config.roles.mod.id)
				: interaction.member?.roles.includes(config.roles.mod.id)))
	) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to cancel this reminder!`,
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
			content: `${constants.emojis.statuses.no} Could not find the reminder to cancel!`,
		});
		return false;
	}

	remindersDatabase.data = filtered;
	return true;
}

defineEvent("messageCreate", async (message) => {
	if (
		message.guild?.id === config.guild.id &&
		message.interaction?.commandName == "bump" &&
		message.author.id === constants.users.disboard
	) {
		remindersDatabase.data = [
			...remindersDatabase.data.filter(
				(reminder) =>
					!(reminder.id === SpecialReminders.Bump && reminder.user === client.user.id),
			),
			{
				channel: BUMPING_THREAD,
				date: Date.now() + 7200000,
				reminder: undefined,
				id: SpecialReminders.Bump,
				user: client.user.id,
			},
		];
	}
});
