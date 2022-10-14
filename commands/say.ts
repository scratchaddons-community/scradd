import {
	PermissionsBitField,
	ModalSubmitInteraction,
	ChatInputCommandInteraction,
	ApplicationCommandOptionType,
	ComponentType,
	TextInputStyle,
	ButtonStyle,
} from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";

import log from "../common/moderation/logging.js";
import type { ChatInputCommand } from "../common/types/command.js";

const command: ChatInputCommand = {
	data: {
		description: "(Mods only) Mimic what you tell me to",
		options: [
			{
				type: ApplicationCommandOptionType.String,
				name: "message",
				description: "What to mimic",
				max_length: 2000,
			},
		],
		default_member_permissions: new PermissionsBitField().toJSON(),
	},

	async interaction(interaction) {
		const content = interaction.options.getString("message");
		if (content) return say(interaction, content);

		await interaction.showModal({
			title: `/${interaction.command?.name}`,
			custom_id: "say",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							custom_id: "message",
							label: "Message",
							max_length: 2000,
							required: true,
							style: TextInputStyle.Paragraph,
						},
					],
				},
			],
		});
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
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									label: "View Message",
									style: ButtonStyle.Link,
									url: message.url,
								},
							],
						},
					],
				},
			),
		]);
	}
}
