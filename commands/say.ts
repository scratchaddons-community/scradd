import {
	ModalSubmitInteraction,
	ChatInputCommandInteraction,
	ApplicationCommandOptionType,
	ComponentType,
	TextInputStyle,
	ButtonStyle,
	chatInputApplicationCommandMention,
} from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import log from "../common/logging.js";
import { defineCommand } from "../common/types/command.js";

const command = defineCommand({
	data: {
		description: "(Mods only) Mimic what you tell me to",
		options: {
			message: {
				type: ApplicationCommandOptionType.String,
				description: "What to mimic",
				maxLength: 2000,
			},
		},
		restricted: true,
		censored: "channel",
	},

	async interaction(interaction) {
		const content = interaction.options.getString("message");
		if (content) return say(interaction, content);

		await interaction.showModal({
			title: `/${interaction.command?.name}`,
			customId: "say",
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.TextInput,
							customId: "message",
							label: "Message",
							maxLength: 2000,
							required: true,
							style: TextInputStyle.Paragraph,
						},
					],
				},
			],
		});
		return await interaction.channel?.sendTyping();
	},
});
export default command;

export async function say(
	interaction: ModalSubmitInteraction | ChatInputCommandInteraction<"raw" | "cached">,
	content: string,
) {
	const message = await interaction.channel?.send(content);

	if (message) {
		await Promise.all([
			interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true }),
			log(
				`💬 ${interaction.user.toString()} used ${chatInputApplicationCommandMention(
					"say",
					(
						await CONSTANTS.guild.commands.fetch()
					)?.find((command) => command.name === "say")?.id || "",
				)} in ${message.channel.toString()}!`,
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
