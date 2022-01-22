import { SlashCommandBuilder } from "@discordjs/builders";
import SuggestionBuilder from "../common/suggest.js";
import dotenv from "dotenv";

dotenv.config();
const { BUGS_CHANNEL } = process.env;
if (!BUGS_CHANNEL) throw new Error("BUGS_CHANNEL is not set in the .env.");

const ANSWERS = {
	VALIDBUG: "Valid Bug",
	MINORBUG: "Minor Bug",
	INDEVELOPMENT: "In Development",
	INVALIDBUG: "Invalid Bug",
	FIXED: "Fixed",
};

const BugsChannel = new SuggestionBuilder(BUGS_CHANNEL);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("Manage and create bug reports in #suggestions")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new bug report")
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
				.setDescription("(Devs Only) Answer a bug report")
				.addStringOption((option) =>
					option
						.setName("answer")
						.setDescription("Answer to the bug report")
						.addChoice(ANSWERS.VALIDBUG, ANSWERS.VALIDBUG)
						.addChoice(ANSWERS.MINORBUG, ANSWERS.MINORBUG)
						.addChoice(ANSWERS.INDEVELOPMENT, ANSWERS.INDEVELOPMENT)
						.addChoice(ANSWERS.INVALIDBUG, ANSWERS.INVALIDBUG)
						.addChoice(ANSWERS.FIXED, ANSWERS.FIXED)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("delete").setDescription("Delete a bug report"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription("Edit a bug report")
				.addStringOption((option) =>
					option
						.setName("report")
						.setDescription("Your updated bug report")
						.setRequired(true),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();
		if (command === "create") {
			const { thread } = await BugsChannel.createMessage(interaction, {
				title: interaction.options.getString("title") || "",
				description: interaction.options.getString("report") || "",
			});
			await interaction.reply({
				content: `:white_check_mark: Bug report posted! See ${thread}`,
				ephemeral: true,
			});
		} else if (command === "answer") {
			const answer = interaction.options.getString("answer");
			await Promise.all([
				BugsChannel.answerSuggestion(interaction, answer || "", {
					[ANSWERS.VALIDBUG]: "GREEN",
					[ANSWERS.MINORBUG]: "DARK_GREEN",
					[ANSWERS.INDEVELOPMENT]: "YELLOW",
					[ANSWERS.INVALIDBUG]: "RED",
					[ANSWERS.FIXED]: "BLUE",
				}),
				interaction.reply({
					content: `:white_check_mark: Answered report as ${answer}! Please elaborate on your answer below.`,
					ephemeral: true,
				}),
			]);
		} else if (command === "delete") {
			await BugsChannel.deleteSuggestion(interaction);
		} else if (command === "edit") {
			if (
				await BugsChannel.editSuggestion(
					interaction,
					interaction.options.getString("report") || "",
				)
			)
				interaction.reply({
					content: "Sucessfully editted bug report.",
					ephemeral: true,
				});
		}
	},
};

export default info;
