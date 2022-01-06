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
		thread.setName(
			thread.name.replace(/(.*) \|/i, answer + " |"),
			"Thread answered by " + interaction.user.tag,
		);
		thread.fetchStarterMessage().then(async (message) => {
			/** @type {import("discord.js").ColorResolvable} */
			let color = "#000000";
			switch (answer) {
				case ANSWERS.GOODIDEA:
					color = "#1abc9c";
					break;
				case ANSWERS.INDEVELOPMENT:
					color = "#f1c40f";
					break;
				case ANSWERS.IMPLEMENTED:
					color = "#2ecc71";
					break;
				case ANSWERS.POSSIBLE:
					color = "#3498db";
					break;
				case ANSWERS.IMPRACTICAL:
					color = "#e74c3c";
					break;
				case ANSWERS.REJECTED:
					color = "#c0392b";
					break;
				case ANSWERS.IMPOSSIBLE:
					color = "#9b59b6";
					break;
			}
			console.log(message.embeds[0]?.setColor(color));
			message.edit({ embeds: message.embeds });
		});

		interaction.reply({
			content: `:white_check_mark: Answered suggestion as ${answer}! Please elaborate on your answer below.`,
			ephemeral: true,
		});
	},
};

export default info;
