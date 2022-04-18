/** @file Commands To manage bug reports. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { Constants } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import SuggestionChannel, { MAX_TITLE_LENGTH, RATELIMT_MESSAGE } from "../common/suggest.js";
import escapeMessage from "../lib/escape.js";

const { BUGS_CHANNEL, GUILD_ID } = process.env;

if (!BUGS_CHANNEL) throw new ReferenceError("BUGS_CHANNEL is not set in the .env.");

/** @type {import("../common/suggest.js").Answer[]} */
const ANSWERS = [
	{
		color: Constants.Colors.GREEN,
		description: "This bug has been verified and it will be fixed soon",
		name: "Valid Bug",
	},
	{
		color: Constants.Colors.DARK_GREEN,

		description:
			"This bug is not a high priority to fix it as it does not affect usage of the addon",

		name: "Minor Bug",
	},
	{
		color: Constants.Colors.GOLD,
		description: "A contributor is currently working to fix this bug",
		name: "In Development",
	},
	{
		color: Constants.Colors.BLUE,
		description: "This bug has been fixed in the next version of Scratch Addons",
		name: "Fixed",
	},
	{
		color: Constants.Colors.RED,
		description: "This is not something that we can or will change",
		name: "Invalid Bug",
	},
];

export const CHANNEL_TAG = "#bugs";

const channel = new SuggestionChannel(BUGS_CHANNEL);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(`Commands to manage bug reports in ${CHANNEL_TAG}.`)
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
				),
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
				),
		),

	async interaction(interaction) {
		if (interaction.guild?.id !== GUILD_ID) throw new Error("Ran command in the wrong server!");

		const command = interaction.options.getSubcommand();

		switch (command) {
			case "create": {
				const success = await channel.createMessage(interaction, {
					description: interaction.options.getString("bugreport") ?? "",
					title: interaction.options.getString("title") ?? "",
				});

				if (success) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.yes} Bug report posted! See ${
							success.thread?.toString() ?? ""
						}. If you made any mistakes, you can fix them with \`/bugreport edit\`.`,

						ephemeral: true,
					});
				}

				break;
			}
			case "answer": {
				const answer = interaction.options.getString("answer") ?? "";
				const result = await channel.answerSuggestion(interaction, answer, ANSWERS);
				if (result) {
					await interaction.reply({
						content:
							`${
								CONSTANTS.emojis.statuses.yes
							} Successfully answered bug report as **${escapeMessage(answer)}**!` +
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
