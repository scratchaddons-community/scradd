const { SlashCommandBuilder } = require('@discordjs/builders');
const addons = require('../addons.json')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('addon')
		.setDescription('Replies with information about a specific addon.')
        .addStringOption(option =>
		option.setName('addon_name')
			.setDescription('The name of the addon')
			.setRequired(true)),

	async execute(interaction) {
		await interaction.reply(addons.addons[interaction.options.getString('addon_name')].description)
	},
}
