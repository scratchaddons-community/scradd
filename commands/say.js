import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

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
		const content = interaction.options.getString("message") || "";

		const message = await interaction.channel?.send({ content });

		if (message) {
			const channel = await interaction.guild?.channels.fetch(
				process.env.ERROR_CHANNEL || "",
			);

			await Promise.all([
				interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true }),
				channel?.isText() &&
					channel.send({
						content: `${interaction.user.toString()} used \`/say\` in ${message.channel.toString()}!`,

						allowedMentions: { users: [] },
						components: [
							new MessageActionRow().addComponents(
								new MessageButton()
									.setEmoji("👀")
									.setLabel("View Message")
									.setStyle("LINK")
									.setURL(message.url),
							),
						],
					}),
			]);
		}
	},
};

export default info;
