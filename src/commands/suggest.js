import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";

const SUGGESTION_CHANNEL_ID = "927059179657625612";

/** @type {import("../lib/types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Post a suggestion in #suggestions")
		.addStringOption((option) =>
			option
				.setName("title")
				.setDescription("Title for the suggestion embed").setRequired(true),
		)		.addStringOption((option) =>
			option.setName("suggestion").setDescription("Your suggestion").setRequired(true),
		),


	async interaction(interaction) {
		const embed = new MessageEmbed()
			.setColor("#222222")
			.setAuthor({ name: interaction.user.tag, iconURL: interaction.user.avatarURL()||"" })
			.setDescription(interaction.options.getString("suggestion")||"")
			.setTimestamp();

		const title=interaction.options.getString("title")
		if (title) embed.setTitle(title)

		const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL_ID);
		if (channel && "send" in channel) {
			await Promise.all([
			interaction.reply({content:
				":white_check_mark: Suggestion posted in "+channel.toString(),ephemeral:true}
				), channel.send({embeds: [embed]}).then(async(message) => {

					await Promise.all([
					message.react("👍").then(() => message.react("👎")),
					message.startThread({
						name: "Unanswered | " + title,
						autoArchiveDuration: "MAX",
						reason: "Suggestion by " + interaction.user.tag,
					}).then((thread) => {
						thread.send({content: interaction.user.toString()}).then(message=>message.delete())
					})
				])
			})
			]);
		} else {
			await interaction.reply({content:":negative_squared_cross_mark: Suggestion failed :(",ephemeral:true});
		}
	},
};

export default info;
