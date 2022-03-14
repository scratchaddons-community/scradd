/** @file Commands To manage bug reports. */
import { SlashCommandBuilder } from "@discordjs/builders";
import CONSTANTS from "../common/CONSTANTS.js";

import SuggestionChannel, {
	MAX_TITLE_LENGTH,
	NO_SERVER_START,
	RATELIMT_MESSAGE,
} from "../common/suggest.js";
import escapeMessage from "../lib/escape.js";

const { BUGS_CHANNEL, GUILD_ID } = process.env;

if (!BUGS_CHANNEL) throw new ReferenceError("BUGS_CHANNEL is not set in the .env.");

/** @type {import("../common/suggest.js").Answer[]} */
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

/** @type {import("../common/suggest.js").Category[]} */
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
		customResponse: `${NO_SERVER_START}<#${BUGS_CHANNEL}>, they can see SA bugs they can fix without having to dig through tons of bug reports for me. If I have a bug or the server has a mistake, please send me a DM to let the mods know.`,
		name: "Server bug",
	},

	{ description: "Anything not listed above", name: "Other" },
];

export const CHANNEL_TAG = "#bugs";

const channel = new SuggestionChannel(BUGS_CHANNEL, CATEGORIES);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(".")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription(`Create a new bug report in ${CHANNEL_TAG}.`)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(
							`A short summary of the bug report (maximum ${MAX_TITLE_LENGTH} characters)`,
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("bugreport")
						.setDescription("A detailed description of the bug")
						.setRequired(true),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("category")
						.setDescription("Bug report category")
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
				.setDescription(
					`(Devs only) Answer a bug report. Use this in threads in ${CHANNEL_TAG}.`,
				)
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
				.setName("edit")
				.setDescription(
					`(OP Only) Edit a bug report. Use this in threads in ${CHANNEL_TAG}.`,
				)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(
							`A short summary of the bug report (maximum ${MAX_TITLE_LENGTH} characters)`,
						)
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("bugreport")
						.setDescription("A detailed description of the bug")
						.setRequired(false),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("category")
						.setDescription("Bug report category")
						.setRequired(false);

					for (const category of CATEGORIES) {
						if (category.customResponse) continue;

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
					description: interaction.options.getString("bugreport") || "",
					title: interaction.options.getString("title") || "",
				});

				if (success) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.yes} Bug report posted! See ${
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
							`${
								CONSTANTS.emojis.statuses.yes
							} Successfully answered bug report as ${escapeMessage(answer)}!` +
							(result === "ratelimit" ? " " + RATELIMT_MESSAGE : ""),

						ephemeral: false,
					});
				}

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
						content: `${CONSTANTS.emojis.statuses.yes} Successfully edited bug report!${
							result === "ratelimit" ? " " + RATELIMT_MESSAGE : ""
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
