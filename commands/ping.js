const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	meta: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!'),
	async run(interaction) {
		await interaction.reply('Pong!');
	},
};
