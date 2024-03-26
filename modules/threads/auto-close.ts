import {
	ButtonStyle,
	ChannelType,
	ComponentType,
	GuildMember,
	TimestampStyles,
	time,
	type AnyThreadChannel,
	type ButtonInteraction,
	type ChatInputCommandInteraction,
	type InteractionResponse,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { parseTime } from "../../util/numbers.js";
import { SpecialReminders, remindersDatabase } from "../reminders/misc.js";
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
	const timer = options.options.time.toLowerCase();
	if (timer === "never") {
		if (options.subcommand === "lock-in")
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
			id: SpecialReminders[options.subcommand === "close-in" ? "CloseThread" : "LockThread"],
		},
	];
	await queueReminders();

	const [type] = options.subcommand.split("-");
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
}

export async function cancelThreadChange(
	interaction: ButtonInteraction,
	type: string,
): Promise<InteractionResponse | undefined> {
	if (
		!config.roles.staff ||
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.staff.id)
		:	interaction.member?.roles.includes(config.roles.staff.id))
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
		remindersDatabase.data = remindersDatabase.data.filter(
			(reminder) =>
				!(
					reminder.id ===
						SpecialReminders[type === "close" ? "CloseThread" : "LockThread"] &&
					reminder.user === client.user.id &&
					reminder.channel === interaction.channel?.id
				),
		);
		await queueReminders();

		await interaction.reply(`${constants.emojis.statuses.yes} Canceled ${type}!`);
	}
}

export async function autoClose(
	{ locked: wasLocked }: AnyThreadChannel,
	thread: AnyThreadChannel,
): Promise<void> {
	if (thread.guild.id !== config.guild.id) return;
	const options = getThreadConfig(thread);
	if (thread.archived && options.keepOpen) await thread.setArchived(false, "Keeping thread open");

	if (
		!wasLocked &&
		thread.locked &&
		(thread.type === ChannelType.PrivateThread || thread.parent?.isThreadOnly())
	) {
		const date = Date.now() + 43_200_000;
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: thread.id,
				date: date,
				reminder: undefined,
				user: client.user.id,
				id: SpecialReminders.CloseThread,
			},
		];
		await queueReminders();

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
	}
}
