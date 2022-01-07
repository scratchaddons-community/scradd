import { SlashCommandBuilder } from "@discordjs/builders";
import { answerSuggestion, createMessage, deleteSuggestion } from "../common/suggest.js";
import { MessageEmbed } from "discord.js";

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
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("delete").setDescription("Delete a report"),
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
				.setTitle(interaction.options.getString("title") || "")
				.setDescription(interaction.options.getString("report") || "")
				.setTimestamp();

			createMessage(interaction, embed);
		} else if (command === "answer") {
			const answer = interaction.options.getString("answer");
			answerSuggestion(interaction, answer, () => {
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
			deleteSuggestion(interaction);
		}
	},
};

export default info;
