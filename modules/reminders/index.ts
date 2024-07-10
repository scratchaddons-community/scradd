import { ApplicationCommandOptionType } from "discord.js";
import { client, defineButton, defineEvent, defineSelect, defineSubcommands } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { disableComponents } from "../../util/discord.js";
import { cancelReminder, createReminder, listReminders } from "./management.js";
import { bumpingThread, SpecialReminders, remindersDatabase } from "./misc.js";
import queueReminders from "./send.js";

defineSubcommands(
	{
		name: "reminders",
		description: "Manage your reminders",
		censored: false,
		access: true,
		subcommands: {
			add: {
				description: "Sets a reminder",
				options: {
					dm: {
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
			list: { description: "View your reminders", options: {} },
		},
	},
	async (interaction, options) => {
		switch (options.subcommand) {
			case "list": {
				await listReminders(interaction);
				break;
			}
			case "add": {
				await createReminder(interaction, options.options);
			}
		}
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
		message.interaction?.commandName == "bump" &&
		message.author.id === constants.users.disboard &&
		message.guild?.id === config.guild.id
	) {
		remindersDatabase.data = [
			...remindersDatabase.data.filter(
				(reminder) =>
					!(reminder.id === SpecialReminders.Bump && reminder.user === client.user.id),
			),
			{
				channel: bumpingThread?.id ?? message.channel.id,
				date: Date.now() + 7_200_000,
				reminder: undefined,
				id: SpecialReminders.Bump,
				user: client.user.id,
			},
		];
		await queueReminders();
	}
});
