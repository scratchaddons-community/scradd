import { SlashCommandBuilder } from "@discordjs/builders";
import SuggestionBuilder from "../common/suggest.js";
import dotenv from "dotenv";

dotenv.config();
const { BUGS_CHANNEL } = process.env;
if (!BUGS_CHANNEL) throw new Error("BUGS_CHANNEL is not set in the .env.");

const ANSWERS = {
	VALID_BUG: "Valid Bug",
	MINOR_BUG: "Minor Bug",
	IN_DEVELOPMENT: "In Development",
	INVALID_BUG: "Invalid Bug",
	FIXED: "Fixed",
};

const BugsChannel = new SuggestionBuilder(BUGS_CHANNEL);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(".")
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
				)
				.addStringOption((option) =>
					option
						.setName("category")
						.setDescription("Report category")
						.addChoice("Addon bug", "Addon bug")
						.addChoice("Settings bug", "Settings bug")
						.addChoice("Core bug (happens with no addons enabled)", "Core bug")
						.addChoice("Server mistake/Scradd bug", "Server bug")
						.addChoice("Other", "Other")
						.setRequired(true),
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
						.addChoice(ANSWERS.VALID_BUG, ANSWERS.VALID_BUG)
						.addChoice(ANSWERS.MINOR_BUG, ANSWERS.MINOR_BUG)
						.addChoice(ANSWERS.IN_DEVELOPMENT, ANSWERS.IN_DEVELOPMENT)
						.addChoice(ANSWERS.INVALID_BUG, ANSWERS.INVALID_BUG)
						.addChoice(ANSWERS.FIXED, ANSWERS.FIXED)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("delete")
				.setDescription(
					"(Devs, mods, and OP only) Delete a bug report. Use this in threads in #reports.",
				),
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
				)
				.addStringOption((option) =>
					option
						.setName("category")
						.setDescription("Report category")
						.addChoice("Addon bug", "Addon bug")
						.addChoice("Settings bug", "Settings bug")
						.addChoice("Core bug (happens with no addons enabled)", "Core bug")
						// .addChoice("Server mistake/Scradd bug", "Server bug")
						.addChoice("Other", "Other")
						.setRequired(false),
				),
		),

	async interaction(interaction) {
		if (interaction.guild?.id !== process.env.GUILD_ID) return;
		const command = interaction.options.getSubcommand();
		switch (command) {
			case "create": {
				const res = await BugsChannel.createMessage(interaction, {
					title: interaction.options.getString("title") || "",
					description: interaction.options.getString("report") || "",
					type: "Report",
					category: interaction.options.getString("category") || "",
				});
				if (res) {
					await interaction.reply({
						content: `<:yes:940054094272430130> Bug report posted! See ${res.thread}`,
						ephemeral: true,
					});
				}

				break;
			}
			case "answer": {
				const answer = interaction.options.getString("answer");
				if (
					await BugsChannel.answerSuggestion(interaction, answer || "", {
						[ANSWERS.VALID_BUG]: "GREEN",
						[ANSWERS.MINOR_BUG]: "DARK_GREEN",
						[ANSWERS.IN_DEVELOPMENT]: "YELLOW",
						[ANSWERS.INVALID_BUG]: "RED",
						[ANSWERS.FIXED]: "BLUE",
					})
				)
					interaction.reply({
						content: `:white_check_mark: Answered report as ${answer}! Please elaborate on your answer below. If the thread title does not update immediately, you may have been ratelimited. I will automatically change the title once the rate limit is up (within the next hour).`,
						ephemeral: true,
					});
				break;
			}
			case "delete": {
				await BugsChannel.deleteSuggestion(interaction);

				break;
			}
			case "edit": {
				const title = interaction.options.getString("title");
				if (
					await BugsChannel.editSuggestion(interaction, {
						body: interaction.options.getString("report"),
						title,
						category: interaction.options.getString("category"),
					})
				) {
					interaction.reply({
						content:
							"<:yes:940054094272430130> Successfully edited bug report! " +
							(title
								? "If the thread title does not update immediately, you may have been ratelimited. I will automatically change the title once the rate limit is up (within the next hour)."
								: ""),
						ephemeral: true,
					});
				}

				break;
			}
		}
	},
};

export default info;
