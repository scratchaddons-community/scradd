import {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	PermissionsBitField,
	ModalBuilder,
	ActionRowBuilder,
	TextInputBuilder,
	TextInputStyle,
	ModalSubmitInteraction,
	ChatInputCommandInteraction,
} from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";

import log from "../common/moderation/logging.js";
import type { ChatInputCommand } from "../common/types/command.js";

const command: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setDescription("(Mods only) Mimic what you tell me to")
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON())
		.addStringOption((input) =>
			input.setName("message").setDescription("What to mimic").setMaxLength(2_000),
		),

	async interaction(interaction) {
		const content = interaction.options.getString("message");
		if (content) return say(interaction, content);

		await interaction.showModal(
			new ModalBuilder()
				.setTitle(`/${interaction.command?.name}`)
				.setCustomId("say")
				.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId("message")
							.setLabel("Message")
							.setMaxLength(2_000)
							.setRequired(true)
							.setStyle(TextInputStyle.Paragraph),
					),
				),
		);
		return await interaction.channel?.sendTyping();
	},
	censored: "channel",
};
export default command;

const commandMarkdown = `</say:${
	(await client.application?.commands.fetch({ guildId: process.env.GUILD_ID }))?.find(
		(command) => command.name === "say",
	)?.id
}>`; // TODO: chatInputApplicationCommandMention

export async function say(
	interaction: ModalSubmitInteraction | ChatInputCommandInteraction<"raw" | "cached">,
	content: string,
) {
	const message = await interaction.channel?.send(content);

	if (message) {
		await Promise.all([
			interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true }),
			log(
				`💬 ${interaction.user.toString()} used ${commandMarkdown} in ${message.channel.toString()}!`,
				"messages",
				{
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
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
}
