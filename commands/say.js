import { SlashCommandBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import log from "../common/moderation/logging.js";
import { MessageActionRowBuilder } from "../types/ActionRowBuilder.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("(Mods only) Mimic what you tell me to")
		.setDefaultPermission(false)
		.addStringOption((input) =>
			input.setName("message").setDescription("What to mimic").setRequired(true),
		),

	async interaction(interaction) {
		const content = interaction.options.getString("message", true);

		const message = await interaction.channel?.send({ content });

		if (message) {
			await Promise.all([
				interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true }),
				interaction.guild &&
					log(
						interaction.guild,
						`${interaction.user.toString()} used \`/say\` in ${message.channel.toString()}!`,
						"messages",
						{
							components: [
								new MessageActionRowBuilder().addComponents(
									new ButtonBuilder()
										.setEmoji("👀")
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

export default info;
