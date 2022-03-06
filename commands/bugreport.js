/** @file Commands To manage bug reports. */
import { SlashCommandBuilder } from "@discordjs/builders";

import SuggestionChannel, { MAX_TITLE_LENGTH } from "../common/suggest.js";
import escapeMessage from "../lib/escape.js";

const { BUGS_CHANNEL, GUILD_ID } = process.env;

if (!BUGS_CHANNEL) throw new ReferenceError("BUGS_CHANNEL is not set in the .env.");

/** @type {import("../common/suggest.js").Answers} */
const ANSWERS = [
	{
		color: "GREEN",
		description: "This bug has been verified and it will be fixed soon",
		name: "Valid Bug",
	},
	{
		color: "DARK_GREEN",

		description:
			"This bug is not a high priority to fix it as it does not affect usage of the addon",

		name: "Minor Bug",
	},
	{
		color: "GOLD",
		description: "A contributor is currently working to fix this bug",
		name: "In Development",
	},
	{
		color: "BLUE",
		description: "This bug has been fixed in the next version of Scratch Addons",
		name: "Fixed",
	},
	{
		color: "RED",
		description: "This is not something that we can or will change",
		name: "Invalid Bug",
	},
];

const CATEGORIES = [
	{
		description: "A bug that is only reproduced on Scratch when one or more addons are enabled",

		name: "Addon bug",
	},

	{
		description: "A bug found on the settings page or in non-addon-specific areas of popup",
		name: "Settings bug",
	},

	{ description: "A bug happening with no addons enabled", name: "Core bug" },

	{
		description: "A bug in me or a mistake made with the server",
		editableTo: false,
		name: "Server bug",
	},

	{ description: "Anything not listed above", name: "Other" },
];

const channel = new SuggestionChannel(BUGS_CHANNEL);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(".")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new bug report in #bugs.")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(
							`A short summary of your bug report (maximum ${MAX_TITLE_LENGTH} characters)`,
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("report")
						.setDescription("A detailed description of the bug")
						.setRequired(true),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("category")
						.setDescription("Report category")
						.setRequired(true);

					for (const category of CATEGORIES) {
						newOption.addChoice(
							`${category.name} (${category.description})`,
							category.name,
						);
					}

					return newOption;
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription("(Devs only) Answer a bug report. Use this in threads in #bugs.")
				.addStringOption((option) => {
					const newOption = option
						.setName("answer")
						.setDescription("Answer to the bug report")
						.setRequired(true);

					for (const answer of ANSWERS)
						newOption.addChoice(`${answer.name} (${answer.description})`, answer.name);

					return newOption;
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("delete")
				.setDescription(
					"(Devs, mods, and OP only) Delete a bug report. Use this in threads in #bugs.",
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription("(OP Only) Edit a bug report. Use this in threads in #bugs.")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(
							`A short summary of your bug report (maximum ${MAX_TITLE_LENGTH} characters)`,
						)
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("report")
						.setDescription("A detailed description of the bug")
						.setRequired(false),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("category")
						.setDescription("Report category")
						.setRequired(false);

					for (const category of CATEGORIES) {
						if (category.editableTo === false) continue;

						newOption.addChoice(
							`${category.name} (${category.description})`,
							category.name,
						);
					}

					return newOption;
				}),
		),

	async interaction(interaction) {
		if (interaction.guild?.id !== GUILD_ID) return;

		const command = interaction.options.getSubcommand();

		switch (command) {
			case "create": {
				const success = await channel.createMessage(interaction, {
					category: interaction.options.getString("category") || "",
					description: interaction.options.getString("report") || "",
					title: interaction.options.getString("title") || "",
					type: "Report",
				});

				if (success) {
					await interaction.reply({
						content: `<:yes:940054094272430130> Bug report posted! See ${
							success.thread?.toString() || ""
						}. If you made any mistakes, you can fix them with \`/bugreport edit\`.`,

						ephemeral: true,
					});
				}

				break;
			}
			case "answer": {
				const answer = interaction.options.getString("answer") || "";
				const result = await channel.answerSuggestion(interaction, answer, ANSWERS);
				if (result) {
					await interaction.reply({
						content:
							`:white_check_mark: Answered report as ${escapeMessage(
								answer,
							)}! Please elaborate on your answer below.` +
							(result === "ratelimit"
								? " If the thread title does not update immediately, you may have been ratelimited. I will automatically change the title once the ratelimit is up (within the next hour)."
								: ""),

						ephemeral: true,
					});
				}

				break;
			}
			case "delete": {
				await channel.deleteSuggestion(interaction);

				break;
			}
			case "edit": {
				const title = interaction.options.getString("title");

				const result = await channel.editSuggestion(interaction, {
					body: interaction.options.getString("report"),
					category: interaction.options.getString("category"),
					title,
				});
				if (result) {
					await interaction.reply({
						content: `<:yes:940054094272430130> Successfully edited bug report!${
							result === "ratelimit"
								? " If the thread title does not update immediately, you may have been ratelimited. I will automatically change the title once the ratelimit is up (within the next hour)."
								: ""
						}`,

						ephemeral: true,
					});
				}

				break;
			}
		}
	},
};

export default info;
