import { SlashCommandBuilder, Colors, escapeMarkdown, cleanContent } from "discord.js";
import client, { guild } from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";

import SuggestionChannel, { getUserFromFeedback, RATELIMT_MESSAGE } from "../common/feedback.js";
import { escapeLinks } from "../lib/markdown.js";
import { getAllMessages, paginate, reactAll } from "../lib/discord.js";
import { truncateText } from "../lib/text.js";

/** @type {[string, string][]} */
export const SUGGESTION_EMOJIS = [
	["👍", "👎"], // These are the emojis that are currently used.
	["959117513088720926", "🍅"],
	["575851403558256642", "575851403600330792"],
	["✅", "613912745699442698"],
	["613912747578621952", "613912747440209930"],
	["613912747612045322", "613913094984564736"],
	["613912745837985832", "613912745691054080"],
	["😀", "😔"],
	["❤", "💔"],
	["749005259682086964", "749005284403445790"],
];

/** @type {import("../common/feedback").Answer[]} */
const ANSWERS = [
	{ name: "Unanswered", color: Colors.Greyple, description: "This hasn’t yet been answered" },
	{
		color: Colors.Green,
		description: "This will probably be added if anyone codes it",
		name: "Good Idea",
	},
	{
		color: Colors.Orange,
		description: "This already exists in Scratch or in Scratch Addons",
		name: "Implemented",
	},
	{
		color: Colors.Red,
		description: "This isn’t something we may add for technical reasons",
		name: "Impossible",
	},
	{
		color: Colors.LuminousVividPink,
		description: "This is possible, but it’d require lots of code and isn’t worth it",
		name: "Impractical",
	},
	{
		color: Colors.Gold,
		description: "Someone is currently working on this",
		name: "In Development",
	},
	{
		color: Colors.DarkGreen,
		description:
			"This is possible, but it could be rejected for things like ethical or technical reasons",
		name: "Possible",
	},
	{
		color: Colors.DarkRed,
		description: "Wouldn’t work for non-SA users or users who don’t have the addon/option on",
		name: "Incompatible",
	},
	{
		color: Colors.Purple,
		description: "We don’t want to add this for some reason",
		name: "Rejected",
	},
];

const channel =
	CONSTANTS.channels.suggestions && new SuggestionChannel(CONSTANTS.channels.suggestions);

const CHANNEL_TAG = `#${CONSTANTS.channels.suggestions?.name}`;

/** @type {import("../types/command").ChatInputCommand | undefined} */
export default channel && {
	data: new SlashCommandBuilder()
		.setDescription(`Commands to manage suggestions in ${CHANNEL_TAG}`)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription(`Create a new suggestion in ${CHANNEL_TAG}`)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(`A short summary of the suggestion `)
						.setRequired(true)
						.setMaxLength(100),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("A detailed description of the suggestion")
						.setRequired(true)
						.setMinLength(30),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription(
					`(Devs only; For use in ${CHANNEL_TAG}’s threads) Answer a suggestion`,
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("answer")
						.setDescription("Answer to the suggestion")
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
					`(OP/Mods only; For use in ${CHANNEL_TAG}’s threads) Edit a suggestion`,
				)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(`A short summary of the suggestion`)
						.setRequired(false)
						.setMaxLength(100),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("A detailed description of the suggestion")
						.setRequired(false)
						.setMinLength(30),
				),
		)

		.addSubcommand((subcommand) =>
			subcommand
				.setName("get-top")
				.setDescription("Get the top suggestions")
				.addUserOption((input) =>
					input
						.setName("user")
						.setDescription("Filter suggestions to only get those by a certain user")
						.setRequired(false),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("answer")
						.setDescription(
							"Filter suggestions to only get those with a certain answer",
						)
						.setRequired(false);

					for (const answer of ANSWERS)
						newOption.addChoices({
							name: `${answer.name} (${answer.description})`,
							value: answer.name,
						});

					return newOption;
				}),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand(true);

		const message =
			interaction.channel?.isThread() && (await interaction.channel?.fetchStarterMessage());

		if (message && message.author.id === client.user?.id) {
			const emoji = message.reactions.valueOf().first()?.emoji;
			await reactAll(
				message,
				SUGGESTION_EMOJIS.find(([one]) => one === emoji?.id || emoji?.name) ||
					SUGGESTION_EMOJIS[0] ||
					[],
			);
		}

		switch (command) {
			case "create": {
				const success = await channel.createMessage(interaction, {
					description: interaction.options.getString("suggestion", true),
					title: interaction.options.getString("title", true),
				});

				if (success) {
					await Promise.all([
						reactAll(success, SUGGESTION_EMOJIS[0] || []),
						interaction.reply({
							content: `${CONSTANTS.emojis.statuses.yes} Suggestion posted! See ${
								success.thread?.toString() ?? ""
							}. If you made any mistakes, you can fix them with \`/suggestion edit\`.`,
							ephemeral: true,
						}),
					]);
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
							} Successfully answered suggestion as **${escapeMarkdown(
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
					body: interaction.options.getString("suggestion"),
					title: interaction.options.getString("title"),
				});
				if (result) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.yes} Successfully edited suggestion!${
							result === "ratelimit" ? " " + RATELIMT_MESSAGE : ""
						}`,

						ephemeral: true,
					});
				}

				break;
			}
			case "get-top": {
				const requestedUser = interaction.options.getUser("user");
				const requestedAnswer = interaction.options.getString("answer");

				await interaction.deferReply();
				const unfiltered = await getAllMessages(channel.channel);
				// todo: asyncFilter
				const all = (
					await Promise.all(
						unfiltered.map(async (message) => {
							const count = SUGGESTION_EMOJIS.map(([upvote, downvote]) => {
								const upvoteReaction = message.reactions.resolve(upvote);
								const downvoteReaction = message.reactions.resolve(downvote);

								if (!upvoteReaction || !downvoteReaction) return false;

								return (upvoteReaction.count ?? 0) - (downvoteReaction.count ?? 0);
							}).find((currentCount) => typeof currentCount === "number");

							if (typeof count !== "number") return;

							const answer =
								message.thread?.name.split(" | ")[1]?.trim() ??
								ANSWERS[0]?.name ??
								"";

							if (
								requestedAnswer &&
								answer.toLowerCase() !== requestedAnswer.toLowerCase()
							)
								return;
							const embed = message.embeds[0];
							const description =
								embed?.title ??
								(embed?.description &&
									cleanContent(embed?.description, message.channel)) ??
								(embed?.image?.url ? embed?.image?.url : message.content);

							const author = await getUserFromFeedback(message);

							if (requestedUser && author?.id !== requestedUser?.id) return;
							return {
								answer,
								author,
								count,
								url: message.url,

								title: truncateText(description, 100),
							};
						}),
					)
				)

					.filter((suggestion) => suggestion)
					.sort(
						(suggestionOne, suggestionTwo) =>
							(suggestionTwo?.count ?? 0) - (suggestionOne?.count ?? 0),
					);

				const nick =
					requestedUser &&
					(await guild.members.fetch(requestedUser.id).catch(() => {}))?.displayName;
				await paginate(
					all,
					(suggestion) =>
						`**${suggestion.count}** ${
							suggestion.count > 0
								? SUGGESTION_EMOJIS[0]?.[0]
								: SUGGESTION_EMOJIS[0]?.[1]
						} [${escapeLinks(suggestion.title)}](${suggestion.url} "${
							suggestion.answer
						}")${
							suggestion.author && !requestedUser
								? ` by ${suggestion.author.toString()}`
								: ""
						}`,
					"No suggestions found. Try changing any filters you may have used.",
					`Top suggestions${requestedUser ? ` by ${nick}` : ""}${
						requestedAnswer ? ` answered with ${requestedAnswer}` : ""
					}`,
					(data) => interaction.editReply(data),
				);
			}
		}
	},
};
