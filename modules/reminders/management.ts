import {
	ButtonStyle,
	ComponentType,
	GuildMember,
	time,
	TimestampStyles,
	ChatInputCommandInteraction,
	MessageComponentInteraction,
} from "discord.js";
import constants from "../../common/constants.js";
import censor, { badWordsAllowed } from "../automod/language.js";
import { convertBase, parseTime } from "../../util/numbers.js";
import { getSettings } from "../settings.js";
import warn from "../punishments/warn.js";
import { getLevelForXp, xpDatabase } from "../xp/misc.js";
import { getUserReminders, remindersDatabase } from "./misc.js";
import config from "../../common/config.js";
import { disableComponents } from "../../util/discord.js";
import queueReminders from "./send.js";

export async function listReminders(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const reminders = getUserReminders(interaction.user.id);

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
					text: `${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`,
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

export async function createReminder(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const reminders = getUserReminders(interaction.user.id);
	const dms = interaction.options.getBoolean("dms") ?? getSettings(interaction.user).dmReminders;
	const reminder = interaction.options.getString("reminder", true);

	if (!dms && !badWordsAllowed(interaction.channel)) {
		const censored = censor(reminder);

		if (censored) {
			await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} ${
					censored.strikes < 1 ? "That’s not appropriate" : "Language"
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
				Math.abs(xpDatabase.data.find(({ user }) => user === interaction.user.id)?.xp ?? 0),
			) * 0.3,
		) +
			5
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You already have ${reminders.length} reminders set! Please cancel some or level up before setting any more.`,
		});
	}

	const date = parseTime(interaction.options.getString("time", true));
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
	await queueReminders();

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
}

export async function cancelReminder(interaction: MessageComponentInteraction, id: string) {
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
	await queueReminders();
	return true;
}
