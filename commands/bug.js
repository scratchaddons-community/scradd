import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";

const { SUGGESTION_CHANNEL } = process.env;

const ANSWERS = {
	VALIDBUG: "Valid Bug",
	MINORBUG: "Minor Bug",
	INDEVELOPMENT: "In Development",
	INVALIDBUG: "Invalid Bug",
	FIXED: "Fixed",
};

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Manage and create reports in #suggestions")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new report")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription("Title for the report embed")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option.setName("report").setDescription("Your report").setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription("(Devs Only) Answer a report")
				.addStringOption((option) =>
					option
						.setName("answer")
						.setDescription("Answer to the report")
						.addChoice(ANSWERS.VALIDBUG, ANSWERS.VALIDBUG)
						.addChoice(ANSWERS.MINORBUG, ANSWERS.MINORBUG)
						.addChoice(ANSWERS.INDEVELOPMENT, ANSWERS.INDEVELOPMENT)
						.addChoice(ANSWERS.INVALIDBUG, ANSWERS.INVALIDBUG)
						.addChoice(ANSWERS.FIXED, ANSWERS.FIXED)
						.setRequired(true),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();
		if (command === "create") {
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

			if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env");
			const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
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
		} else if (command === "answer") {
			const answer = interaction.options.getString("answer");
			if (!SUGGESTION_CHANNEL || !answer)
				throw new Error(
					"Either SUGGESTION_CHANNEL is not set in the .env or you did not provide an answer.",
				);
			if (!interaction.guild)
				return interaction.reply({ content: "How would this work in a DM?? 😛" });
			if (
				!interaction.channel?.isThread() ||
				interaction.channel.parentId !== SUGGESTION_CHANNEL
			)
				return interaction.reply({
					content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL}>.`,
					ephemeral: true,
				});

			interaction.channel
				.setName(
					interaction.channel.name.replace(/(.*) \|/i, answer + " |"),
					"Thread answered by " + interaction.user.tag,
				)
				.catch((err) => {
					console.log("e", err);
				});
			interaction.channel.fetchStarterMessage().then(async (message) => {
				/** @type {import("discord.js").ColorResolvable} */
				let color = "DARK_BUT_NOT_BLACK";
				switch (answer) {
					case ANSWERS.VALIDBUG:
						color = "GREEN";
						break;
					case ANSWERS.MINORBUG:
						color = "DARK_GREEN";
						break;
					case ANSWERS.INDEVELOPMENT:
						color = "YELLOW";
						break;
					case ANSWERS.INVALIDBUG:
						color = "RED";
						break;
					case ANSWERS.FIXED:
						color = "BLUE";
						break;
				}
				const [embed] = message.embeds;
				if (!embed)
					return interaction.reply({
						content: "The first message in this thread has no embed!",
						ephemeral: true,
					});
				embed.setColor(color);
				embed.setTitle(embed.title?.replace(/(.*): /i, answer + ": ") || "");

				message.edit({ embeds: message.embeds });
			});

			interaction.reply({
				content: `:white_check_mark: Answered report as ${answer}! Please elaborate on your answer below.`,
				ephemeral: true,
			});
		}
	},
};

export default info;
