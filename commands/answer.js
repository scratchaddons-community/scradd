import { SlashCommandBuilder } from "@discordjs/builders";

const { SUGGESTION_CHANNEL_ID } = process.env;

const ANSWERS = {
	GOODIDEA: "Good Idea",
	INDEVELOPMENT: "In Development",
	IMPLEMENTED: "Implemented",
	POSSIBLE: "Possible",
	IMPRACTICAL: "Impractical",
	REJECTED: "Rejected",
	IMPOSSIBLE: "Impossible",
};
/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Answer a thread in #suggestions")
		.addStringOption((option) =>
			option
				.setName("answer")
				.setDescription("Answer to the suggestion")
				.setRequired(true)
				.addChoice(ANSWERS.GOODIDEA, ANSWERS.GOODIDEA)
				.addChoice(ANSWERS.INDEVELOPMENT, ANSWERS.INDEVELOPMENT)
				.addChoice(ANSWERS.IMPLEMENTED, ANSWERS.IMPLEMENTED)
				.addChoice(ANSWERS.POSSIBLE, ANSWERS.POSSIBLE)
				.addChoice(ANSWERS.IMPRACTICAL, ANSWERS.IMPRACTICAL)
				.addChoice(ANSWERS.REJECTED, ANSWERS.REJECTED)
				.addChoice(ANSWERS.IMPOSSIBLE, ANSWERS.IMPOSSIBLE),
		),

	async interaction(interaction) {
		const answer = interaction.options.getString("answer");
		if (!SUGGESTION_CHANNEL_ID || !answer) return;
		if (!interaction.guild) return;
		const { threads } = await interaction.guild.channels.fetchActiveThreads();
		const thread = threads.find((thread) => thread.id === interaction.channelId);
		if (!thread) return;
		if (thread.parentId !== SUGGESTION_CHANNEL_ID) return;
		thread
			.setName(
				thread.name.replace(/(.*) \|/i, answer + " |"),
				"Thread answered by " + interaction.user.tag,
			)
			.catch((err) => {
				console.log("e", err);
			});
		thread.fetchStarterMessage().then(async (message) => {
			/** @type {import("discord.js").ColorResolvable} */
			let color = "DARK_BUT_NOT_BLACK";
			switch (answer) {
				case ANSWERS.GOODIDEA:
					color = "GREEN";
					break;
				case ANSWERS.INDEVELOPMENT:
					color = "YELLOW";
					break;
				case ANSWERS.IMPLEMENTED:
					color = "BLUE";
					break;
				case ANSWERS.POSSIBLE:
					color = "ORANGE";
					break;
				case ANSWERS.IMPRACTICAL:
					color = "DARK_RED";
					break;
				case ANSWERS.REJECTED:
					color = "RED";
					break;
				case ANSWERS.IMPOSSIBLE:
					color = "PURPLE";
					break;
			}
			const [embed] = message.embeds;
			if (!embed) return;
			embed.setColor(color);
			embed.setTitle(answer + ": " + embed.title);
			message.edit({ embeds: message.embeds });
		});

		interaction.reply({
			content: `:white_check_mark: Answered suggestion as ${answer}! Please elaborate on your answer below.`,
			ephemeral: true,
		});
	},
};

export default info;
