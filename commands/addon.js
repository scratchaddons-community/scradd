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
        if(typeof addons.addons[interaction.options.getString('addon_name')] === undefined) {
            await interaction.reply('That addon does not exist!')
            return
        }
        const addon = addons.addons[interaction.options.getString('addon_name')]
        
        const exampleEmbed = {
            color: '#0099ff',
            title: addon.name,
            image: {url: addon.image},
            description: addon.description,
            footer: {text: `Contributors: ${addon.credits.join(", ")}`},
        }
        
        
        await interaction.reply({embeds:[exampleEmbed]})
            //await interaction.reply(addons.addons[interaction.options.getString('addon_name')].description)
	},
}
