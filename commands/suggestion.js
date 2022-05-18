/** @file Commands To manage suggestions. */
import { SlashCommandBuilder, Embed } from "@discordjs/builders";
import { Constants, MessageActionRow, MessageButton, MessageEmbed, Util } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import SuggestionChannel, {
	getUserFromSuggestion,
	MAX_TITLE_LENGTH,
	RATELIMT_MESSAGE,
} from "../common/suggest.js";
import { escapeLinks } from "../lib/markdown.js";
import { getAllMessages, reactAll } from "../lib/message.js";
import { generateHash, truncateText } from "../lib/text.js";

const { SUGGESTION_CHANNEL, GUILD_ID } = process.env;

if (!SUGGESTION_CHANNEL) throw new ReferenceError("SUGGESTION_CHANNEL is not set in the .env.");

const PAGE_OFFSET = 15;

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

/** @type {import("../common/suggest.js").Answer[]} */
export const ANSWERS = [
	{
		name: "Unanswered",
		color: Constants.Colors.GREYPLE,
		description: "This has not yet been answered",
	},
	{
		color: Constants.Colors.GREEN,
		description: "This will probably be added if anyone codes it",
		name: "Good Idea",
	},
	{
		color: Constants.Colors.ORANGE,
		description: "This already exists in Scratch or in Scratch Addons",
		name: "Implemented",
	},
	{
		color: Constants.Colors.RED,
		description: "This is not something we may add for technical reasons",
		name: "Impossible",
	},
	{
		color: Constants.Colors.LUMINOUS_VIVID_PINK,
		description: "This is possible, but it would require lots of code and isn’t worth it",
		name: "Impractical",
	},
	{
		color: Constants.Colors.GOLD,
		description: "Someone is currently working on this",
		name: "In Development",
	},
	{
		color: Constants.Colors.DARK_GREEN,
		description:
			"This is possible, but it could be rejected for things like ethical or technical reasons",
		name: "Possible",
	},
	{
		color: Constants.Colors.DARK_RED,
		description: "Wouldn’t work for non-SA users or users who don’t have the addon/option on",
		name: "Incompatible",
	},
	{
		color: Constants.Colors.PURPLE,
		description: "We don’t want to add this for some reason",
		name: "Rejected",
	},
];

export const CHANNEL_TAG = "#suggestions";

const channel = new SuggestionChannel(SUGGESTION_CHANNEL);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(`Commands to manage suggestions in ${CHANNEL_TAG}.`)
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
				),
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

					for (const [index, answer] of ANSWERS.entries()) {
						if (index)
							newOption.addChoice(
								`${answer.name} (${answer.description})`,
								answer.name,
							);
					}

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
				),
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

					for (const answer of ANSWERS)
						newOption.addChoice(`${answer.name} (${answer.description})`, answer.name);

					return newOption;
				}),
		),

	async interaction(interaction) {
		const command = interaction.options.getSubcommand();

		switch (command) {
			case "create": {
				const success = await channel.createMessage(interaction, {
					description: interaction.options.getString("suggestion") ?? "",
					title: interaction.options.getString("title") ?? "",
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
				const answer = interaction.options.getString("answer") ?? "";
				const result = await channel.answerSuggestion(interaction, answer, ANSWERS);
				if (result) {
					await interaction.reply({
						content:
							`${
								CONSTANTS.emojis.statuses.yes
							} Successfully answered suggestion as **${Util.escapeMarkdown(
								answer,
							)}**! __${Util.escapeMarkdown(
								ANSWERS.find(({ name }) => name === answer)?.description || "",
							)}__.` + (result === "ratelimit" ? "\n" + RATELIMT_MESSAGE : ""),

						ephemeral: false,
					});
				}

				break;
			}
			case "edit": {
				const title = interaction.options.getString("title");

				const result = await channel.editSuggestion(interaction, {
					body: interaction.options.getString("suggestion"),
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

							const description =
								message.embeds[0]?.title ??
								(message.embeds[0]?.description &&
									Util.cleanContent(
										message.embeds[0]?.description,
										message.channel,
									)) ??
								(message.embeds[0]?.image?.url
									? message.embeds[0]?.image?.url
									: message.content);

							const author = await getUserFromSuggestion(message);

							if (requestedUser && author?.id !== requestedUser?.id) return;
							return {
								answer,
								author,
								count,
								id: message.id,

								title: truncateText(description, MAX_TITLE_LENGTH),
							};
						}),
					)
				)

					.filter((suggestion) => suggestion)
					.sort(
						(suggestionOne, suggestionTwo) =>
							(suggestionTwo?.count ?? 0) - (suggestionOne?.count ?? 0),
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
					(await interaction.guild?.members.fetch(requestedUser.id))?.displayName;

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

							return `${index + offset + 1}) **${suggestion.count}** ${
								suggestion.count > 0
									? SUGGESTION_EMOJIS[0]?.[0]
									: SUGGESTION_EMOJIS[0]?.[1]
							} [${escapeLinks(suggestion.title)}](https://discord.com/channels/${
								GUILD_ID ?? "@me"
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
							new Embed()
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
								.setColor(Math.floor(Math.random() * (0xffffff + 1))),
						],
					};
				}

				const reply = await interaction.editReply(generateMessage());

				const collector =
					reply.embeds[0] &&
					interaction.channel?.createMessageComponentCollector({
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
