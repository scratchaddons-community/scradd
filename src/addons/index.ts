import { SlashCommandBuilder } from '@discordjs/builders'
import type  CommandInfo from "../../types/command";
import {  MessageEmbed } from "discord.js";
const addons:Record<string,any> = {}

const info:CommandInfo= {
    command: new SlashCommandBuilder()
        .setName('addon')
        .setDescription('Replies with information about a specific addon.')
        .addStringOption(option =>
            option.setName('addon_name')
                .setDescription('The name of the addon')
                .setRequired(true)),

    async onInteraction(interaction) {
        const addonInfo=addons[ interaction.options.getString('addon_name') ||""]
        if (!addonInfo) {
            await interaction.reply('That addon does not exist!');
            return;
        }

        const exampleEmbed = new MessageEmbed()
            .setTitle(addonInfo.name)
            .setColor('#0099ff',)
            .setDescription(addonInfo.description)
            .setFooter({ text: `Contributors: ${addonInfo.credits.join(", ")}` })
            .setImage(`https://scratchaddons.com/assets/img/addons/${interaction.options.getString('addon_name')}.png`)


        await interaction.reply({ embeds: [ exampleEmbed ] });
    },
}
export default info
