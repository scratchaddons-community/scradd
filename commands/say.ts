import {
	type ModalSubmitInteraction,
	type ChatInputCommandInteraction,
	ApplicationCommandOptionType,
	ComponentType,
	TextInputStyle,
	ButtonStyle,
	chatInputApplicationCommandMention,
} from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import log from "../common/logging.js";
import { defineCommand } from "../common/types/command.js";

/**
 * Mimic something.
 *
 * @param interaction - The interaction that triggered this mimic.
 * @param content - What to mimic.
 */
export async function say(
	interaction: ChatInputCommandInteraction<"cached" | "raw"> | ModalSubmitInteraction,
	content: string,
): Promise<void> {
	const message = await interaction.channel?.send(content);

	if (message) {
		await Promise.all([
			interaction.reply({ content: CONSTANTS.emojis.statuses.yes, ephemeral: true }),
			log(
				`💬 ${interaction.user.toString()} used ${chatInputApplicationCommandMention(
					"say",
					(await CONSTANTS.guild.commands.fetch()).find(({ name }) => name === "say")
						?.id ?? "",
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
		if (content) {
			await say(interaction, content);
			return;
		}

		await interaction.showModal({
			title: `/${interaction.command?.name}`,
			customId: "_say",

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

	modals: {
		async say(interaction) {
			await say(interaction, interaction.fields.getTextInputValue("message"));
		},
	},
});
export default command;
