import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageEmbed } from "discord.js";
import {
	answerSuggestion,
	createMessage,
	deleteSuggestion,
	editSuggestion,
} from "../common/suggest.js";

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

			const {thread} = await createMessage(interaction, {
				title: interaction.options.getString("title") || "",
			description:interaction.options.getString("report")||""});
			await interaction.reply({
				content: `:white_check_mark: Bug report posted! See ${thread}`,
				ephemeral: true,
			});
		} else if (command === "answer") {
			const answer = interaction.options.getString("answer");
			await answerSuggestion(interaction, answer||"", () => {
				switch (answer) {
					case ANSWERS.VALIDBUG:
						return "GREEN";
					case ANSWERS.MINORBUG:
						return "DARK_GREEN";
					case ANSWERS.INDEVELOPMENT:
						return "YELLOW";
					case ANSWERS.INVALIDBUG:
						return "RED";
					case ANSWERS.FIXED:
						return "BLUE";
					default:
						return "#000";
				}
			});
			interaction.reply({
				content: `:white_check_mark: Answered report as ${answer}! Please elaborate on your answer below.`,
				ephemeral: true,
			});
		} else if (command === "delete") {
			await deleteSuggestion(interaction);
		} else if (command === "edit") {
			if(await editSuggestion(interaction, interaction.options.getString("report") || ""))			interaction.reply({
				content: "Sucessfully editted bug report.",
				ephemeral: true,
			});
		}
	},
};

export default info;
