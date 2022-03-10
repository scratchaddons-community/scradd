/** @file Commands To manage suggestions. */
import { SlashCommandBuilder } from "@discordjs/builders";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import SuggestionChannel, {
	DEFAULT_ANSWER,
	getUserFromSuggestion,
	MAX_TITLE_LENGTH,
	NO_SERVER_START,
	RATELIMT_MESSAGE,
} from "../common/suggest.js";
import asyncFilter from "../lib/asyncFilter.js";
import escapeMessage, { escapeLinks } from "../lib/escape.js";
import generateHash from "../lib/generateHash.js";
import getAllMessages from "../lib/getAllMessages.js";
import reactAll from "../lib/reactAll.js";
import truncateText from "../lib/truncateText.js";

const { SUGGESTION_CHANNEL, GUILD_ID } = process.env;

if (!SUGGESTION_CHANNEL) throw new ReferenceError("SUGGESTION_CHANNEL is not set in the .env.");

const PAGE_OFFSET = 15;

/** @type {[string, string][]} */
export const OLD_EMOJIS = [
	["👍", "👎"],
	["575851403558256642", "575851403600330792"],
	["✅", "613912745699442698"],
	["613912747578621952", "613912747440209930"],
	["613912747612045322", "613913094984564736"],
	["613912745837985832", "613912745691054080"],
	["😀", "😔"],
	["❤", "💔"],
	["749005259682086964", "749005284403445790"],
];

/** @type {[string, string]} */
export const EMOJIS = ["👍", "👎"];

/** @type {import("../common/suggest.js").Answer[]} */
const ANSWERS = [
	{
		color: "GREEN",
		description: "This will probably be added if anyone codes it",
		name: "Good Idea",
	},
	{
		color: "ORANGE",
		description: "This already exists in Scratch or in Scratch Addons",
		name: "Implemented",
	},
	{
		color: "RED",
		description: "This is not something we can add for technical reasons",
		name: "Impossible",
	},
	{
		color: "LUMINOUS_VIVID_PINK",
		description: "This is possible, but it would require lots of code and isn’t worth it",
		name: "Impractical",
	},
	{
		color: "GOLD",
		description: "Someone is currently working on this",
		name: "In Development",
	},
	{
		color: "DARK_GREEN",
		description:
			"This is possible, but it could be rejected for things like ethical or technical reasons",
		name: "Possible",
	},
	{
		color: "DARK_RED",
		description: "Wouldn’t work for non-SA users or users who don’t have the addon/option on",
		name: "Incompatible",
	},
	{ color: "PURPLE", description: "We don’t want to add this for some reason", name: "Rejected" },
];

/** @type {import("../common/suggest.js").Category[]} */
const CATEGORIES = [
	{
		description: "A feature that has no similar features in other addons already",
		name: "New addon",
	},

	{ description: "A feature that would be added to an existing addon", name: "New feature" },
	{
		description: "A feature for the settings page or popup, shown without any addons enabled",

		name: "Settings addition",
	},

	{
		description: "A suggestion to improve the server or something to add to me",
		customResponse: `${NO_SERVER_START}<#${SUGGESTION_CHANNEL}>, they can see SA suggestions they can add without having to dig through tons of server suggestions. If you have a suggestion to improve me or the server, please post it in <#${CONSTANTS.channels.general}> for discussion.`,
		name: "Server suggestion",
	},

	{
		description: "Something that has no effect for users",
		customResponse:
			"Please suggest things that do not affect users in the development server or on GitHub.",
		name: "Technical suggestion",
	},

	{ description: "Anything not listed above", name: "Other" },
];

export const CHANNEL_TAG = "#suggestions";

const channel = new SuggestionChannel(SUGGESTION_CHANNEL, CATEGORIES);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(".")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription(`Create a new suggestion in ${CHANNEL_TAG}.`)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(
							`A short summary of the suggestion (maximum ${MAX_TITLE_LENGTH} characters)`,
						)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("A detailed description of the suggestion")
						.setRequired(true),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("category")
						.setDescription("Suggestion category")
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
					`(Devs only) Answer a suggestion. Use this in threads in ${CHANNEL_TAG}.`,
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("answer")
						.setDescription("Answer to the suggestion")
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
					`(OP Only) Edit a suggestion. Use this in threads in ${CHANNEL_TAG}.`,
				)
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription(
							`A short summary of the suggestion (maximum ${MAX_TITLE_LENGTH} characters)`,
						)
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("A detailed description of the suggestion")
						.setRequired(false),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("category")
						.setDescription("Suggestion category")
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
		)

		.addSubcommand((subcommand) =>
			subcommand
				.setName("get-top")
				.setDescription("Get the top suggestions")
				.addUserOption((input) =>
					input
						.setName("user")
						.setDescription("Filter suggestions to only get those by a certain user.")
						.setRequired(false),
				)
				.addStringOption((option) => {
					const newOption = option
						.setName("answer")
						.setDescription(
							"Filter suggestions to only get those with a certain answer.",
						)
						.setRequired(false);

					for (const answer of [DEFAULT_ANSWER, ...ANSWERS])
						newOption.addChoice(`${answer.name} (${answer.description})`, answer.name);

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
					description: interaction.options.getString("suggestion") || "",
					title: interaction.options.getString("title") || "",
				});

				if (success) {
					await Promise.all([
						reactAll(success, EMOJIS),
						interaction.reply({
							content: `${CONSTANTS.emojis.statuses.yes} Suggestion posted! See ${
								success.thread?.toString() || ""
							}. If you made any mistakes, you can fix them with \`/suggestion edit\`.`,
							ephemeral: true,
						}),
					]);
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
							} Successfully answered suggestion as ${escapeMessage(
								answer,
							)}! Please elaborate on your answer below.` +
							(result === "ratelimit" ? " " + RATELIMT_MESSAGE : ""),

						ephemeral: false,
					});
				}

				break;
			}
			case "edit": {
				const title = interaction.options.getString("title");

				const result = await channel.editSuggestion(interaction, {
					body: interaction.options.getString("suggestion"),
					category: interaction.options.getString("category"),
					title,
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
				const deferPromise = interaction.deferReply();

				const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);

				if (!channel?.isText())
					throw new ReferenceError("Could not find suggestion channel.");

				const requestedUser = interaction.options.getUser("user");
				const requestedAnswer = interaction.options.getString("answer");

				const [, unfiltered] = await Promise.all([deferPromise, getAllMessages(channel)]);
				const all = (
					await Promise.all(
						unfiltered.map(async (message) => {
							const count = OLD_EMOJIS.map(([upvote, downvote]) => {
								const upvoteReaction = message.reactions.resolve(upvote);
								const downvoteReaction = message.reactions.resolve(downvote);

								if (!upvoteReaction || !downvoteReaction) return false;

								return (upvoteReaction.count || 0) - (downvoteReaction.count || 0);
							}).find((currentCount) => typeof currentCount === "number");

							if (typeof count !== "number") return;

							const answer =
								message.thread?.name.split("|")[0]?.trim() || DEFAULT_ANSWER.name;

							if (
								requestedAnswer &&
								answer.toLowerCase() !== requestedAnswer.toLowerCase()
							)
								return;

							const description =
								message.embeds[0]?.title ||
								message.embeds[0]?.description ||
								message.content;

						const author = await getUserFromSuggestion(message);

							if (requestedUser && author?.id !== requestedUser?.id) return;
							return {
								answer,
								author,
								count,
								id: message.id,

								title: truncateText(
									description.split("/n")[0] || "",
									MAX_TITLE_LENGTH,
								),
							};
						}),
					)
				)

					.filter((suggestion) => suggestion)
					.sort(
						(suggestionOne, suggestionTwo) =>
							(suggestionTwo?.count || 0) - (suggestionOne?.count || 0),
					);

				const previousButton = new MessageButton()
					.setLabel("<< Previous")
					.setStyle("PRIMARY")
					.setDisabled(true)
					.setCustomId(generateHash("previous"));
				const numberOfPages = Math.ceil(all.length / PAGE_OFFSET);
				const nextButton = new MessageButton()
					.setLabel("Next >>")
					.setStyle("PRIMARY")
					.setDisabled(numberOfPages === 1)
					.setCustomId(generateHash("next"));

				const nick =
					requestedUser &&
					(await interaction.guild?.members.fetch(requestedUser.id))?.nickname;

				// eslint-disable-next-line fp/no-let -- This must be changable.
				let offset = 0;

				/**
				 * Generate an embed that lists the top suggestions.
				 *
				 * @returns {| import("discord.js").MessagePayload
				 * 	| import("discord.js").InteractionReplyOptions}
				 *   - Embed with top suggestions.
				 */
				function generateMessage() {
					const content = all
						.filter(
							(suggestion, index) =>
								suggestion && index >= offset && index < offset + PAGE_OFFSET,
						)
						.map((suggestion, index) => {
							if (!suggestion) return ""; // Impossible

							return `${index + offset + 1}. **${suggestion.count}** [${
								suggestion.count > 0 ? EMOJIS[0] : EMOJIS[1]
							} ${escapeLinks(suggestion.title)}](https://discord.com/channels/${
								GUILD_ID || "@me"
							}/${SUGGESTION_CHANNEL}/${suggestion.id} "${suggestion.answer}")${
								suggestion.author && !requestedUser
									? ` by ${suggestion.author.toString()}`
									: ""
							}`;
						})
						.join("\n")
						.trim();

					if (!content) {
						return {
							content: `${CONSTANTS.emojis.statuses.no} No suggestions found. Try changing any filters you may have used.`,

							ephemeral: true,
						};
					}

					return {
						components: [
							new MessageActionRow().addComponents(previousButton, nextButton),
						],

						embeds: [
							new MessageEmbed()
								.setTitle(
									`Top suggestions${requestedUser ? ` by ${nick}` : ""}${
										requestedAnswer ? ` labeled ${requestedAnswer}` : ""
									}`,
								)
								.setDescription(content)
								.setFooter({
									text: `Page ${
										Math.floor(offset / PAGE_OFFSET) + 1
									}/${numberOfPages}`,
								})
								.setColor("RANDOM"),
						],
					};
				}

				await interaction.editReply(generateMessage());

				const collector = interaction.channel?.createMessageComponentCollector({
					filter: (buttonInteraction) =>
						[previousButton.customId, nextButton.customId].includes(
							buttonInteraction.customId,
						) && buttonInteraction.user.id === interaction.user.id,

					time: 30_000,
				});

				collector
					?.on("collect", async (buttonInteraction) => {
						if (buttonInteraction.customId === nextButton.customId)
							offset += PAGE_OFFSET;
						else offset -= PAGE_OFFSET;

						previousButton.setDisabled(offset === 0);
						nextButton.setDisabled(offset + PAGE_OFFSET >= all.length - 1);
						await Promise.all([
							interaction.editReply(generateMessage()),
							buttonInteraction.deferUpdate(),
						]);
						collector.resetTimer();
					})
					.on("end", async () => {
						previousButton.setDisabled(true);
						nextButton.setDisabled(true);
						await interaction.editReply({
							components: [
								new MessageActionRow().addComponents(previousButton, nextButton),
							],

							embeds: (
								await interaction.fetchReply()
							).embeds.map((oldEmbed) => new MessageEmbed(oldEmbed)),
						});
					});
			}
		}
	},
};

export default info;
