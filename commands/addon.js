const { SlashCommandBuilder } = require('@discordjs/builders');
const addons = require('../addons.json')
const { MessageEmbed } = require('discord.js');
module.exports = {
	meta: new SlashCommandBuilder()
		.setName('addon')
		.setDescription('Replies with information about a specific addon.')
        .addStringOption(option =>
		option.setName('addon_name')
			.setDescription('The name of the addon')
			.setRequired(true)),

	async run(interaction) {
        if(addons.addons[interaction.options.getString('addon_name')] == undefined) {
            await interaction.reply('That addon does not exist!')
            return
        }
        const addon = addons.addons[interaction.options.getString('addon_name')]
        
        const exampleEmbed = {
            color: '#0099ff',
            title: addon.name,
            image: {url: `https://scratchaddons.com/assets/img/addons/${interaction.options.getString('addon_name')}.png`},
            description: addon.description,
            footer: {text: `Contributors: ${addon.credits.join(", ")}`},
        }
        
        
        await interaction.reply({embeds:[exampleEmbed]})
	},
}
