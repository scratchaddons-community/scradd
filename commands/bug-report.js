import { SlashCommandBuilder, Colors, escapeMarkdown } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import SuggestionChannel, { getUserFromFeedback, RATELIMT_MESSAGE } from "../common/feedback.js";

/** @type {import("../common/feedback").Answer[]} */
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
			"This bug isn’t a high priority to fix it as it doesn’t affect usage of the addon",

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
		description: "This isn’t something that we can or will change",
		name: "Invalid Bug",
	},
];

const channel = CONSTANTS.channels.bugs && new SuggestionChannel(CONSTANTS.channels.bugs);

const channelTag = `#${CONSTANTS.channels.bugs?.name}`;
/** @type {import("../types/command").ChatInputCommand | undefined} */
export default channel && {
	data: new SlashCommandBuilder()
		.setDescription(`Commands to manage bug reports in ${channelTag}`)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription(`Create a new bug report in ${channelTag}`)
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
					`(Devs only; For use in ${channelTag}’s threads) Answer a bug report`,
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
					`(OP/Mods only; For use in ${channelTag}’s threads) Edit a bug report`,
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
		const command = interaction.options.getSubcommand(true);

		switch (command) {
			case "create": {
				const success = await channel.createMessage(
					interaction,
					{
						description: interaction.options.getString("bug-report", true),
						title: interaction.options.getString("title", true),
					},
					ANSWERS[0]?.name,
				);

				if (success) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.yes} Bug report posted! See ${
							success.thread?.toString() ?? ""
						}. If you made any mistakes, you can fix them with \`/bug-report edit\`.`,
						ephemeral: true,
					});
				}

				break;
			}
			case "answer": {
				const answer = interaction.options.getString("answer", true);
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
				const result = await channel.editSuggestion(interaction, {
					body: interaction.options.getString("report"),
					title: interaction.options.getString("title"),
				});
				const starter =
					interaction.channel?.isThread() &&
					(await interaction.channel.fetchStarterMessage());
				if (result) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.yes} Successfully edited bug report!${
							result === "ratelimit" ? " " + RATELIMT_MESSAGE : ""
						}`,

						ephemeral: !(
							starter &&
							interaction.user.id === (await getUserFromFeedback(starter)).id
						),
					});
				}

				break;
			}
		}
	},
};
