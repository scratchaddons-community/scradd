import { ApplicationCommandOptionType } from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { defineButton, defineSelect, client, defineEvent, defineSubcommands } from "strife.js";
import queueReminders from "./send.js";
import { BUMPING_THREAD, SpecialReminders, remindersDatabase } from "./misc.js";
import { cancelReminder, createReminder, listReminders } from "./management.js";

defineSubcommands(
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
		await (interaction.options.getSubcommand(true) === "list"
			? listReminders(interaction)
			: createReminder(interaction));
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
				date: Date.now() + 7_200_000,
				reminder: undefined,
				id: SpecialReminders.Bump,
				user: client.user.id,
			},
		];
		await queueReminders();
	}
});
