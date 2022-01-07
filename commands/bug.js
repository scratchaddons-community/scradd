import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";

const { SUGGESTION_CHANNEL_ID } = process.env;

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Post a bug report in #suggestions")
		.addStringOption((option) =>
			option.setName("title").setDescription("Title for the bug embed").setRequired(true),
		)
		.addStringOption((option) =>
			option.setName("report").setDescription("Your report").setRequired(true),
		),

	async interaction(interaction) {
		const embed = new MessageEmbed()
			.setColor("#222222")
			.setAuthor({
				name: "Bug report by " + interaction.user.tag,
				iconURL: interaction.user.avatarURL() || "",
			})
			.setDescription(interaction.options.getString("report") || "")
			.setTimestamp();

		const title = interaction.options.getString("title") || "";

		embed.setTitle(title);

		if (!SUGGESTION_CHANNEL_ID) throw new Error("SUGGESTION_CHANNEL_ID is not set in the .env");
		const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL_ID);
		if (channel && "send" in channel) {
			const message = await channel.send({ embeds: [embed] });
			message.react("👍").then(() => message.react("👎"));
			const thread = await message.startThread({
				name: "Unanswered | " + title,
				autoArchiveDuration: "MAX",
				reason: "Bug report by " + interaction.user.tag,
			});
			await thread.members.add(interaction.user.id);
			await interaction.reply({
				content: ":white_check_mark: Bug report posted! " + thread.toString(),
				ephemeral: true,
			});
		} else {
			await interaction.reply({
				content: ":negative_squared_cross_mark: Bug report failed :(",
				ephemeral: true,
			});
		}
	},
};

export default info;
