import type {
	AnyThreadChannel,
	ButtonInteraction,
	ChatInputCommandInteraction,
	InteractionResponse,
} from "discord.js";

import { ButtonStyle, ChannelType, ComponentType, time, TimestampStyles } from "discord.js";
import { client, disableComponents } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";

import "../../util/discord.js";

import { parseTime } from "../../util/numbers.ts";
import { remindersDatabase, SpecialReminder } from "../reminders/misc.ts";
import queueReminders from "../reminders/send.ts";
import { getThreadConfig, threadsDatabase } from "./misc.ts";

export async function cancelThreadChange(
	interaction: ButtonInteraction,
	type: string,
): Promise<InteractionResponse | undefined> {
	if (
		interaction.inGuild() &&
		!interaction.channel?.permissionsFor(interaction.user)?.has("ManageThreads")
	) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to cancel this!`,
		});
	}

	await interaction.message.edit({
		components: disableComponents(interaction.message.components),
	});
	if (!interaction.channel?.isThread())
		throw new TypeError("cancelThreadChange clicked outside of thread");
	if (type === "noclose") {
		const oldConfig = getThreadConfig(interaction.channel);
		threadsDatabase.updateById(
			{ id: interaction.channel.id, keepOpen: false },
			{ roles: oldConfig.roles.join("|") },
		);
		await interaction.reply(
			`${constants.emojis.statuses.yes} This thread will not be prevented from closing!`,
		);
	} else {
		const action = type === "close" ? SpecialReminder.CloseThread : SpecialReminder.LockThread;
		remindersDatabase.data = remindersDatabase.data.filter(
			(reminder) =>
				!(
					reminder.id === action &&
					reminder.user === client.user.id &&
					reminder.channel === interaction.channel?.id
				),
		);

		await interaction.reply(`${constants.emojis.statuses.yes} Canceled ${type}!`);

		await queueReminders();
	}
}

export async function autoClose(
	{ locked: wasLocked }: AnyThreadChannel,
	thread: AnyThreadChannel,
): Promise<void> {
	if (thread.guild.id !== config.guild.id) return;

	if (thread.archived) {
		const options = getThreadConfig(thread);
		if (options.keepOpen) await thread.setArchived(false, "Keeping thread open");
		return;
	}

	if (
		!thread.locked ||
		wasLocked ||
		(thread.type !== ChannelType.PrivateThread && !thread.parent?.isThreadOnly())
	)
		return;

	const date = Date.now() + 86_400_000;
	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: thread.id,
			date: date,
			reminder: undefined,
			user: client.user.id,
			id: SpecialReminder.CloseThread,
		},
	];

	await thread.send({
		content: `${constants.emojis.statuses.yes} I’ll close this thread ${time(
			Math.round(date / 1000),
			TimestampStyles.RelativeTime,
		)}!`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Cancel",
						customId: "close_cancelThreadChange",
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	});

	await queueReminders();
}
