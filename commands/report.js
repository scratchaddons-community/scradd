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
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new bug report in #reports.")
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
				.setDescription("(Devs only) Answer a bug report. Use this in threads in #reports.")
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
			subcommand.setName("delete").setDescription("(Devs, mods, and OP only) Delete a bug report. Use this in threads in #reports."),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription("(OP Only) Edit a bug report. Use this in threads in #reports.")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription("Title for the report embed")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("report")
						.setDescription("Your updated bug report")
						.setRequired(false),
				),
		),

	async interaction(interaction) {
		if (interaction.guild?.id !== process.env.GUILD_ID) return;
		const command = interaction.options.getSubcommand();
		if (command === "create") {
			const res = await BugsChannel.createMessage(interaction, {
				title: interaction.options.getString("title") || "",
				description: interaction.options.getString("report") || "",
				type: "Report"
			});
			if (res) {
				await interaction.reply({
					content: `:white_check_mark: Bug report posted! See ${res.thread}`,
					ephemeral: true,
				});
			}
		} else if (command === "answer") {
			const answer = interaction.options.getString("answer");
			if (
				await BugsChannel.answerSuggestion(interaction, answer || "", {
					[ANSWERS.VALIDBUG]: "GREEN",
					[ANSWERS.MINORBUG]: "DARK_GREEN",
					[ANSWERS.INDEVELOPMENT]: "YELLOW",
					[ANSWERS.INVALIDBUG]: "RED",
					[ANSWERS.FIXED]: "BLUE",
				})
			)
				interaction.reply({
					content: `:white_check_mark: Answered report as ${answer}! Please elaborate on your answer below.`,
					ephemeral: true,
				});
		} else if (command === "delete") {
			await BugsChannel.deleteSuggestion(interaction);
		} else if (command === "edit") {
			if (
				await BugsChannel.editSuggestion(interaction, {
					body: interaction.options.getString("report"),
					title: interaction.options.getString("title"),
				})
			)
				interaction.reply({
					content: "Sucessfully edited bug report.",
					ephemeral: true,
				});
		}
	},
};

export default info;
