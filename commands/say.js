import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import log from "../common/moderation/logging.js";
import { MessageActionRowBuilder } from "../common/types/ActionRowBuilder.js";

/** @type {import("../common/types/command").ChatInputCommand} */
export default {
	data: new SlashCommandBuilder()
		.setDescription("(Mods only) Mimic what you tell me to")
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON())
		.addStringOption((input) =>
			input.setName("message").setDescription("What to mimic").setRequired(true),
		),

	async interaction(interaction) {
		const message = await interaction.channel?.send(
			interaction.options.getString("message", true),
		);

		if (message) {
			await Promise.all([
				interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true }),
				log(
					`💬 ${interaction.user.toString()} used </${interaction.command?.name}:${
						interaction.command?.id // TODO: chatInputApplicationCommandMention
					}> in ${message.channel.toString()}!`,
					"messages",
					{
						components: [
							new MessageActionRowBuilder().addComponents(
								new ButtonBuilder()
									.setLabel("View Message")
									.setStyle(ButtonStyle.Link)
									.setURL(message.url),
							),
						],
					},
				),
			]);
		}
	},
	censored: "channel",
};
