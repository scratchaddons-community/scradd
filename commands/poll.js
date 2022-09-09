import { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } from "discord.js";
import { guild } from "../client.js";

/** @type {import("../common/types/command").ChatInputCommand} */
export default {
	data: new SlashCommandBuilder()
		.setDescription("Create a new poll")
		.setDefaultMemberPermissions(new PermissionsBitField().toJSON())
		.addStringOption(option => option.setName('a').setDescription('Option A').setRequired(true))
        .addStringOption(option => option.setName('b').setDescription('Option B').setRequired(true))
        .addStringOption(option => option.setName('description').setDescription('Poll Description').setRequired(true)),

	async interaction(interaction) {
        const user = interaction.options.getUser("user") || interaction.user;
		const member = await guild.members.fetch(user.id).catch(() => {});

		let message = interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setAuthor({
                        iconURL: (member || user).displayAvatarURL(),
						name: member?.displayName ?? user.username,
                    })
                    .setTitle("New Poll!")
                    .setDescription(`${interaction.options.getString('description')}`)
                    .addFields(
                        { name: `🅰️`, value: `${interaction.options.getString('a')}`, inline: true},
                        { name: `🅱️`, value: `${interaction.options.getString('b')}`, inline: true},
                    )
                    .setFooter({
                        text:"(This command is in beta and more features will come in the future.)"
                            ,
                    }),
            ],
            fetchReply:true
        });
        (await message).react("🅰️"),
        (await message).react("🅱️")
	},
	censored: "channel",
};
