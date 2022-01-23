import { SlashCommandBuilder } from "@discordjs/builders";
import { Message, MessageButton, MessageEmbed } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import { BOARD_CHANNEL } from "../common/board.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription(
		"Replies with a random message from the potato board.",
	),
	async interaction(interaction) {
		const board = await interaction.guild?.channels.fetch(BOARD_CHANNEL);
		if (!board?.isText())
			throw new Error(
				"No board channel found. Make sure BOARD_CHANNEL is set in the .env file.",
			);

		const fetchedMessages = await getAllMessages(board, (message) => {
			return !!(
				message.content &&
				message.embeds[0] &&
				message.author.bot &&
				message.components[0]
			);
		});

		const nextButton = new MessageButton()
			.setLabel("Next")
			.setCustomId("next")
			.setStyle("SECONDARY")
			.setEmoji("➡");

		/** @returns {import("discord.js").InteractionReplyOptions} */
		function generateMessage() {
			const index = Math.floor(Math.random() * fetchedMessages.length);
			const source = fetchedMessages[index];
			fetchedMessages.splice(index, 1);
			if (!source || !source.components[0]?.components[0]) {
				throw new Error("impossible to get here");
			}
			return {
				content: source.content,
				embeds: source.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
				files: source.attachments.map((a) => a),
				components: [
					source.components[0]?.components[0]
						? source.components[0]?.setComponents(
								source.components[0].components[0],
								nextButton,
						  )
						: source.components[0],
				],
				allowedMentions: { users: [] },
			};
		}

		await interaction.reply(generateMessage());

		const collector = interaction.channel?.createMessageComponentCollector({
			filter: (i) => i.customId === "next" && i.user.id === interaction.user.id,
			time: 10_000,
		});

		collector
			?.on("collect", async (i) => {
				interaction.editReply(generateMessage());
				i.deferUpdate();
				collector.resetTimer();
			})
			.on("end", async () => {
				const source = await interaction.fetchReply();
				if (!(source instanceof Message)) return interaction.deleteReply();

				interaction.editReply({
					content: source.content,
					embeds: source.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
					files: source.attachments.map((a) => a),
					components: source.components?.[0]?.components[0]
						? [
								source.components[0]?.setComponents(
									source.components[0].components[0],
									nextButton.setDisabled(true),
								),
						  ]
						: source.components.map((components) =>
								components.setComponents(
									components.components.map((component) =>
										component.setDisabled(true),
									),
								),
						  ),
					allowedMentions: { users: [] },
				});
			});
	},
};

export default info;
