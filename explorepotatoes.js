import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import dotenv from "dotenv";

dotenv.config();

import { BOARD_CHANNEL } from "../common/board.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder().setDescription("Replies with a random message from the potato board."),
	async interaction(interaction) {
		const board = await interaction.guild?.channels.fetch(BOARD_CHANNEL || "");
		if (!board?.isText())
			throw new Error("No board channel found. Make sure BOARD_CHANNEL is set in the .env file.");

		const fetchedMessages = await getAllMessages(board);
		const message = fetchedMessages[Math.floor(Math.random()*fetchedMessages.length)];
		if(!message) return;
		if(!message.embeds[0]) {
			await interaction.reply('no embed :(');
			return;
		}
		await interaction.reply({
			content: message.content,
			embeds: message.embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
			files: message.attachments.map((a) => a),
			components: message.components,
			allowedMentions:{users:[]}
		});
	},
};

export default info;
