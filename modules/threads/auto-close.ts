import {
	ButtonStyle,
	ChannelType,
	ComponentType,
	TimestampStyles,
	time,
	type AnyThreadChannel,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	type InteractionResponse,
} from "discord.js";
import { disableComponents,client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import {  } from "../../util/discord.js";
import { parseTime } from "../../util/numbers.js";
import { SpecialReminder, remindersDatabase } from "../reminders/misc.js";
import queueReminders from "../reminders/send.js";
import { getThreadConfig, threadsDatabase } from "./misc.js";

export async function setUpAutoClose(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	options: { subcommand: "close-in" | "lock-in"; options: { time: string } },
): Promise<InteractionResponse | undefined> {
	if (!interaction.channel?.isThread())
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} This command can only be used in threads!`,
		});

	const threadConfig = getThreadConfig(interaction.channel);
	const type = options.subcommand === "close-in" ? "close" : "lock";
	const timer = options.options.time.toLowerCase();
	if (timer === "never") {
		if (type === "lock")
			return await interaction.reply({
				ephemeral: true,
				content: `${constants.emojis.statuses.no} That option is not supported for this command!`,
			});

		threadsDatabase.updateById(
			{ id: interaction.channel.id, keepOpen: !threadConfig.keepOpen },
			{ roles: threadConfig.roles.join("|") },
		);

		return await interaction.reply({
			content: `${constants.emojis.statuses.yes} This thread will ${
				threadConfig.keepOpen ? "not " : ""
			}be prevented from closing!`,

			components:
				threadConfig.keepOpen ?
					[]
				:	[
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									label: "Undo",
									customId: "noclose_cancelThreadChange",
									style: ButtonStyle.Danger,
								},
							],
						},
					],
		});
	}

	const date = parseTime(timer);
	if (+date < Date.now() + 900_000 || +date > Date.now() + 1_814_400_000) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Could not parse the time! Make sure to pass in the value as so: \`1h30m\`, for example. Note that I can’t close the thread sooner than 15 minutes or later than 3 weeks.`,
		});
	}

	remindersDatabase.data = [
		...remindersDatabase.data,
		{
			channel: interaction.channel.id,
			date: +date,
			reminder: undefined,
			user: client.user.id,
			id: type === "close" ? SpecialReminder.CloseThread : SpecialReminder.LockThread,
		},
	];

	await interaction.reply({
		content: `${constants.emojis.statuses.yes} I’ll ${type} this thread ${time(
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
						customId: `${type}_cancelThreadChange`,
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	});

	await queueReminders();
}

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
