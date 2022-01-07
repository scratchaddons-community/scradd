import { SlashCommandBuilder } from "@discordjs/builders";
import {
	answerSuggestion,
	createMessage,
	deleteSuggestion,
	editSuggestion,
} from "../common/suggest.js";

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
		.setDescription("Manage and create suggestions in #suggestions")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new suggestion")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription("Title for the suggestion embed")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("Your suggestion")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription("(Devs Only) Answer a suggestion")
				.addStringOption((option) =>
					option
						.setName("answer")
						.setDescription("Answer to the suggestion")
						.addChoice(ANSWERS.GOODIDEA, ANSWERS.GOODIDEA)
						.addChoice(ANSWERS.INDEVELOPMENT, ANSWERS.INDEVELOPMENT)
						.addChoice(ANSWERS.IMPLEMENTED, ANSWERS.IMPLEMENTED)
						.addChoice(ANSWERS.POSSIBLE, ANSWERS.POSSIBLE)
						.addChoice(ANSWERS.IMPRACTICAL, ANSWERS.IMPRACTICAL)
						.addChoice(ANSWERS.REJECTED, ANSWERS.REJECTED)
						.addChoice(ANSWERS.IMPOSSIBLE, ANSWERS.IMPOSSIBLE)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("delete").setDescription("Delete a suggestion"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription("Edit a suggestion")
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("Your updated suggestion")
						.setRequired(true),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();
		if (command === "create") {
			const { thread, message } = await createMessage(interaction, {
				title: interaction.options.getString("title") || "",
				description: interaction.options.getString("suggestion") || "",
			});
			await message.react("👍").then(() => message.react("👎"));
			await interaction.reply({
				content: `:white_check_mark: Suggestion posted! See ${thread}`,
				ephemeral: true,
			});
		} else if (command === "answer") {
			const answer = interaction.options.getString("answer");
			await answerSuggestion(interaction, answer || "", () => {
				switch (answer) {
					case ANSWERS.GOODIDEA:
						return "GREEN";
					case ANSWERS.INDEVELOPMENT:
						return "YELLOW";
					case ANSWERS.IMPLEMENTED:
						return "BLUE";
					case ANSWERS.POSSIBLE:
						return "ORANGE";
					case ANSWERS.IMPRACTICAL:
						return "DARK_RED";
					case ANSWERS.REJECTED:
						return "RED";
					case ANSWERS.IMPOSSIBLE:
						return "PURPLE";
					default:
						return "#000";
				}
			});
			interaction.reply({
				content: `:white_check_mark: Answered suggestion as ${answer}! Please elaborate on your answer below.`,
				ephemeral: true,
			});
		} else if (command === "delete") {
			await deleteSuggestion(interaction);
		} else if (command === "edit") {
			if (
				await editSuggestion(interaction, interaction.options.getString("suggestion") || "")
			)
				interaction.reply({
					content: "Sucessfully editted suggestion.",
					ephemeral: true,
				});
		}
	},
};

export default info;
