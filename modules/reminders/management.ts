import type {
	ChatInputCommandInteraction,
	InteractionResponse,
	MessageComponentInteraction,
} from "discord.js";

import {
	ButtonStyle,
	channelMention,
	ComponentType,
	GuildMember,
	time,
	TimestampStyles,
} from "discord.js";
import { disableComponents, paginate } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { convertBase, parseTime } from "../../util/numbers.ts";
import { getSettings } from "../settings.ts";
import { getLevelForXp } from "../xp/misc.ts";
import { xpDatabase } from "../xp/util.ts";
import { getUserReminders, remindersDatabase } from "./misc.ts";
import queueReminders from "./send.ts";

export async function listReminders(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true, fetchReply: true });

	const reminders = getUserReminders(interaction.user.id);
	await paginate(
		reminders,
		(reminder) =>
			`\`${reminder.id}\`) ${time(
				new Date(reminder.date),
				TimestampStyles.RelativeTime,
			)}: ${channelMention(reminder.channel)} ${reminder.reminder ?? ""}`,
		(data) => interaction.editReply(data),
		{
			title: "Your reminders",
			singular: "reminder",
			failMessage: "You don’t have any reminders set!",

			user: interaction.user,
			totalCount: reminders.length,

			timeout: constants.collectorTime,
			format:
				interaction.member instanceof GuildMember ? interaction.member : interaction.user,

			generateComponents(page) {
				return [
					{
						customId: "_cancelReminder",
						type: ComponentType.StringSelect,
						placeholder: "Cancel",
						options: page.map((reminder) => ({
							value: reminder.id.toString(),
							description: reminder.reminder?.toString().slice(0, 100),
							label: reminder.id.toString(),
						})),
					},
				];
			},
		},
	);
}

export async function createReminder(
	interaction: ChatInputCommandInteraction,
	options: { dm?: boolean; time: string; reminder: string },
): Promise<InteractionResponse | undefined> {
	const reminders = getUserReminders(interaction.user.id);
	const dm = options.dm ?? (await getSettings(interaction.user)).dmReminders;

	if (
		reminders.length >
		Math.ceil(
			getLevelForXp(
				xpDatabase.data.find(({ user }) => user === interaction.user.id)?.xp ?? 0,
			) * 0.3,
		) +
			5
	)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You already have ${
				reminders.length
			} reminders set! Please cancel some or level up before setting any more.`,
		});

	const date = parseTime(options.time);
	if (+date < Date.now() + 60_000 || +date > Date.now() + 31_536_000_000)
		return await interaction.reply({
			ephemeral: true,
			content: `${
				constants.emojis.statuses.no
			} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t remind you sooner than 1 minute or later than 365 days.`,
		});

	const channel =
		dm ? (await interaction.user.createDM().catch(() => void 0))?.id : interaction.channel?.id;
	if (!channel)
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Your DMs are closed, so I can’t remind you!`,
		});

	const id = convertBase(Date.now().toString(), 10, convertBase.MAX_BASE);
	remindersDatabase.data = [
		...remindersDatabase.data,
		{ channel, date: +date, reminder: options.reminder, user: interaction.user.id, id },
	];

	await interaction.reply({
		ephemeral: dm,
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

	await queueReminders();
}

export async function cancelReminder(
	interaction: MessageComponentInteraction,
	id: string,
): Promise<boolean> {
	if (
		interaction.user.id !== interaction.message.interactionMetadata?.user.id &&
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.staff.id)
		:	interaction.member?.roles.includes(config.roles.staff.id))
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
