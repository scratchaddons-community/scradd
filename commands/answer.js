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
		if (!SUGGESTION_CHANNEL_ID || !answer) throw new Error("Either SUGGESTION_CHANNEL_ID is not set in the .env or you did not provide an answer.");
		if (!interaction.guild) return interaction.reply({content:"How would this work in a DM?? 😛"});
		if (!interaction.channel?.isThread() || interaction.channel.parentId !== SUGGESTION_CHANNEL_ID) return interaction.reply({content: `This command can only be used in threads in <#${SUGGESTION_CHANNEL_ID}>.`, ephemeral: true});
		
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
			if (!embed) return interaction.reply({content:"The first message in this thread has no embed!",ephemeral:true});
			embed.setColor(color);
			embed.setTitle(embed.title?.replace(/(.*): /i, answer + ": ") || "");

			message.edit({ embeds: message.embeds });
		});

		interaction.reply({
			content: `:white_check_mark: Answered suggestion as ${answer}! Please elaborate on your answer below.`,
			ephemeral: true,
		});
	},
};

export default info;
