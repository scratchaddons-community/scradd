import { SlashCommandBuilder } from "@discordjs/builders";

const { SUGGESTION_CHANNEL_ID } = process.env;

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Answer a thread in #suggestions")
		.addStringOption((option) =>
			option
				.setName("answer")
				.setDescription("Answer to the suggestion")
				.setRequired(true)
				.addChoice("Good Idea", "Good Idea")
				.addChoice("In development", "In development")
				.addChoice("Implemented", "Implemented")
				.addChoice("Possible", "Possible")
				.addChoice("Impractical", "Impractical")
				.addChoice("Rejected", "Rejected")
				.addChoice("Impossible", "Impossible"),
		),

	async interaction(interaction) {
		const answer = interaction.options.getString("answer");
		if (!SUGGESTION_CHANNEL_ID || !answer) return;
		interaction.guild?.channels.fetch(interaction.channelId).then(async (thread) => {
			if (!thread) return;
			if (thread.parentId !== SUGGESTION_CHANNEL_ID) return;
			thread.setName(thread.name.replace(/(.*) \|/i, answer + " |"));
			interaction.reply({
				content: `:white_check_mark: Answered suggestion as ${answer}! Please elaborate on your answer below.`,
			});
		});
	},
};

export default info;
