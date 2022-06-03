import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import log from "../common/moderation/logging.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(
			"(Mods only) Say what you tell me to say. Won’t publically share the author.",
		)
		.setDefaultPermission(false)
		.addStringOption((input) =>
			input.setName("message").setDescription("What you want me to say").setRequired(true),
		),

	async interaction(interaction) {
		const content = interaction.options.getString("message") ?? "";

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
								new MessageActionRow().addComponents(
									new MessageButton()
										.setEmoji("👀")
										.setLabel("View Message")
										.setStyle("LINK")
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
