import { SlashCommandBuilder }  from'@discordjs/builders';
import type CommandInfo from "../../types/command";

const info:CommandInfo=  {
	command: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async onInteraction(interaction) {
		await interaction.reply('Pong!');
	},
};

export default info
