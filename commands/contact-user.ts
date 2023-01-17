import { ApplicationCommandOptionType, ButtonStyle, ComponentType, GuildMember } from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import startTicket, { getThreadFromMember } from "../common/contactMods.js";
import { defineCommand } from "../common/types/command.js";
import { disableComponents } from "../util/discord.js";

const command = defineCommand({
	data: {
		description: "(Mods only) Start a ticket with a user",
		restricted: true,

		options: {
			user: {
				required: true,
				type: ApplicationCommandOptionType.User,
				description: "The user to start a ticket with",
			},
		},
	},

	async interaction(interaction) {
		const user = interaction.options.getMember("user");

		if (!(user instanceof GuildMember)) {
			await interaction.reply({
				content: `${CONSTANTS.emojis.statuses.no} Could not find user.`,
				ephemeral: true,
			});

			return;
		}

		const existingThread = await getThreadFromMember(user);

		if (existingThread) {
			await interaction.reply({
				content: `${
					CONSTANTS.emojis.statuses.no
				} ${user.toString()} already has a ticket open! Talk to them in ${existingThread.toString()}.`,

				ephemeral: true,
			});

			return;
		}

		const message = await interaction.reply({
			content: `Are you sure you want to start a ticket with **${user.toString()}**?`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							label: "Confirm",
							style: ButtonStyle.Success,
							customId: `confirm-${interaction.id}`,
						},
						{
							type: ComponentType.Button,
							label: "Cancel",
							customId: `cancel-${interaction.id}`,
							style: ButtonStyle.Danger,
						},
					],
				},
			],
			fetchReply: true,
		});

		const collector = message.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				buttonInteraction.customId.endsWith(`-${interaction.id}`) &&
				buttonInteraction.user.id === interaction.user.id,

			time: CONSTANTS.collectorTime,
			max: 1,
		});

		collector
			.on("collect", async (buttonInteraction) => {
				if (buttonInteraction.customId.startsWith("confirm-")) {
					const thread = await startTicket(interaction, user);
					if (thread)
						await buttonInteraction.reply({
							content: `${
								CONSTANTS.emojis.statuses.yes
							} **Ticket opened!** Send ${user.toString()} a message in ${thread.toString()}.`,
						});
				} else {
					await buttonInteraction.deferUpdate();
				}
			})
			.on("end", async () => {
				await message.edit({ components: disableComponents(message.components) });
			});
	},
});
export default command;
