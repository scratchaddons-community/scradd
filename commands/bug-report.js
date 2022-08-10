import { SlashCommandBuilder } from "@discordjs/builders";
import { Colors, escapeMarkdown } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import SuggestionChannel, { RATELIMT_MESSAGE } from "../common/suggest.js";

const { BUGS_CHANNEL } = process.env;

if (!BUGS_CHANNEL) throw new ReferenceError("BUGS_CHANNEL is not set in the .env");

/** @type {import("../common/suggest.js").Answer[]} */
const ANSWERS = [
	{
		name: "Unverified",
		color: Colors.Greyple,
		description: "This bug hasn’t been verified as an actual bug yet",
	},
	{
		color: Colors.Green,
		description: "This bug has been verified and it will be fixed soon",
		name: "Valid Bug",
	},
	{
		color: Colors.DarkGreen,

		description:
			"This bug is not a high priority to fix it as it does not affect usage of the addon",

		name: "Minor Bug",
	},
	{
		color: Colors.Gold,
		description: "A contributor is currently working to fix this bug",
		name: "In Development",
	},
	{
		color: Colors.Blue,
		description: "This bug has been fixed in the next version of Scratch Addons",
		name: "Fixed",
	},
	{
		color: Colors.Red,
		description: "This is not something that we can or will change",
		name: "Invalid Bug",
	},
];

export const CHANNEL_TAG = "#bugs";

const channel = new SuggestionChannel(BUGS_CHANNEL);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(`Commands to manage bug reports in ${CHANNEL_TAG}`)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription(`Create a new bug report in ${CHANNEL_TAG}`)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(`A short summary of the bug report`)
						.setRequired(true)
						.setMaxLength(100),
				)
				.addStringOption((option) =>
					option
						.setName("bug-report")
						.setDescription("A detailed description of the bug")
						.setRequired(true)
						.setMinLength(30),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription(
					`(Devs only; For use in ${CHANNEL_TAG}’s threads) Answer a bug report`,
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("answer")
						.setDescription("Answer to the bug report")
						.setRequired(true);

					for (const [index, answer] of ANSWERS.entries()) {
						if (index)
							newOption.addChoices({
								name: `${answer.name} (${answer.description})`,
								value: answer.name,
							});
					}

					return newOption;
				}),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription(
					`(OP/Mods only; For use in ${CHANNEL_TAG}’s threads) Edit a bug report`,
				)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(`A short summary of the bug report`)
						.setRequired(false)
						.setMaxLength(100),
				)
				.addStringOption((option) =>
					option
						.setName("bug-report")
						.setDescription("(OP only) A detailed description of the bug")
						.setRequired(false)
						.setMinLength(30),
				),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();

		switch (command) {
			case "create": {
				const success = await channel.createMessage(
					interaction,
					{
						description: interaction.options.getString("bugreport") ?? "",
						title: interaction.options.getString("title") ?? "",
					},
					ANSWERS[0]?.name,
				);

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
							} Successfully answered bug report as **${escapeMarkdown(
								answer,
							)}**! *${escapeMarkdown(
								ANSWERS.find(({ name }) => name === answer)?.description || "",
							)}*.` + (result === "ratelimit" ? "\n" + RATELIMT_MESSAGE : ""),

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
