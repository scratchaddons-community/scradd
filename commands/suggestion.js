import { SlashCommandBuilder } from "@discordjs/builders";
import SuggestionBuilder, { MAX_TITLE_LENGTH } from "../common/suggest.js";
import { MessageActionRow, MessageButton, MessageEmbed, MessagePayload } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import generateHash from "../lib/generateHash.js";
import dotenv from "dotenv";
import truncateText from "../lib/truncateText.js";

dotenv.config();
const { SUGGESTION_CHANNEL } = process.env;
if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
const PAGE_OFFSET = 15;

const ANSWERS = {
	GOODIDEA: "Good Idea",
	IN_DEVELOPMENT: "In Development",
	IMPLEMENTED: "Implemented",
	POSSIBLE: "Possible",
	IMPRACTICAL: "Impractical",
	REJECTED: "Rejected",
	IMPOSSIBLE: "Impossible",
};

const SuggestionChannel = new SuggestionBuilder(SUGGESTION_CHANNEL);

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription(".")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new suggestion in #suggestions.")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription("Title for the suggestion embed")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("Your suggestion")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("category")
						.setDescription("Suggestion category")
						.addChoice("New addon", "New addon")
						.addChoice("New feature (in existing addon)", "New feature")
						.addChoice("Settings page addition", "Settings addition")
						.addChoice("Server/Scradd suggestion", "Server suggestion")
						.addChoice("Other", "Other")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription(
					"(Devs only) Answer a suggestion. Use this in threads in #suggestions.",
				)
				.addStringOption((option) =>
					option
						.setName("answer")
						.setDescription("Answer to the suggestion")
						.addChoice(ANSWERS.GOODIDEA, ANSWERS.GOODIDEA)
						.addChoice(ANSWERS.IN_DEVELOPMENT, ANSWERS.IN_DEVELOPMENT)
						.addChoice(ANSWERS.IMPLEMENTED, ANSWERS.IMPLEMENTED)
						.addChoice(ANSWERS.POSSIBLE, ANSWERS.POSSIBLE)
						.addChoice(ANSWERS.IMPRACTICAL, ANSWERS.IMPRACTICAL)
						.addChoice(ANSWERS.REJECTED, ANSWERS.REJECTED)
						.addChoice(ANSWERS.IMPOSSIBLE, ANSWERS.IMPOSSIBLE)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("delete")
				.setDescription(
					"(Devs, mods, and OP only) Delete a suggestion. Use this in threads in #suggestions.",
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription("(OP Only) Edit a suggestion. Use this in threads in #suggestions.")
				.addStringOption((option) =>
					option
						.setName("title")
						.setDescription("Title for the suggestion embed")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("Your updated suggestion")
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName("category")
						.setDescription("Suggestion category")
						.addChoice("New addon", "New addon")
						.addChoice("New feature (in existing addon)", "New feature")
						.addChoice("Settings page addition", "Settings addition")
						// .addChoice("Server/Scradd suggestion", "Server suggestion")
						.addChoice("Other", "Other")
						.setRequired(false),
				),
		),
	// .addSubcommand((subcommand) =>
	// 	subcommand
	// 		.setName("get-top")
	// 		.setDescription("Get the top suggestions")
	// 		.addUserOption((input) =>
	// 			input
	// 				.setName("user")
	// 				.setDescription("Filter suggestions to only get those by a certain user.")
	// 				.setRequired(false),
	// 		)
	// 		.addStringOption((option) =>
	// 			option
	// 				.setName("answer")
	// 				.setDescription(
	// 					"Filter suggestions to only get those with a certain answer.",
	// 				)
	// 				.addChoice(ANSWERS.GOODIDEA, ANSWERS.GOODIDEA)
	// 				.addChoice(ANSWERS.IN_DEVELOPMENT, ANSWERS.IN_DEVELOPMENT)
	// 				.addChoice(ANSWERS.IMPLEMENTED, ANSWERS.IMPLEMENTED)
	// 				.addChoice(ANSWERS.POSSIBLE, ANSWERS.POSSIBLE)
	// 				.addChoice(ANSWERS.IMPRACTICAL, ANSWERS.IMPRACTICAL)
	// 				.addChoice(ANSWERS.REJECTED, ANSWERS.REJECTED)
	// 				.addChoice(ANSWERS.IMPOSSIBLE, ANSWERS.IMPOSSIBLE)
	// 				.addChoice("Unanswered", "Unanswered")
	// 				.setRequired(false),
	// 		),
	//)
	async interaction(interaction) {
		if (interaction.guild?.id !== process.env.GUILD_ID || !interaction.channel?.isText())
			return;
		const command = interaction.options.getSubcommand();
		switch (command) {
			case "create": {
				const res = await SuggestionChannel.createMessage(interaction, {
					title: interaction.options.getString("title") || "",
					description: interaction.options.getString("suggestion") || "",
					type: "Suggestion",
					category: interaction.options.getString("category") || "",
				});
				if (res) {
					await Promise.all([
						res.message.react("👍").then(() => res.message.react("👎")),
						interaction.reply({
							content: `<:yes:940054094272430130> Suggestion posted! See ${res.thread}`,
							ephemeral: true,
						}),
					]);
				}
				break;
			}
			case "answer": {
				const answer = interaction.options.getString("answer");
				if (
					await SuggestionChannel.answerSuggestion(interaction, answer || "", {
						[ANSWERS.GOODIDEA]: "GREEN",
						[ANSWERS.IN_DEVELOPMENT]: "YELLOW",
						[ANSWERS.IMPLEMENTED]: "BLUE",
						[ANSWERS.POSSIBLE]: "ORANGE",
						[ANSWERS.IMPRACTICAL]: "DARK_RED",
						[ANSWERS.REJECTED]: "RED",
						[ANSWERS.IMPOSSIBLE]: "PURPLE",
					})
				)
					interaction.reply({
						content: `<:yes:940054094272430130> Successfully answered suggestion as ${answer}! Please elaborate on your answer below. If the thread title does not update immediately, you may have been ratelimited. I will automatically change the title once the rate limit is up (within the next hour).`,
						ephemeral: true,
					});
				break;
			}
			case "delete": {
				await SuggestionChannel.deleteSuggestion(interaction);
				break;
			}
			case "edit": {
				const title = interaction.options.getString("title");
				if (
					await SuggestionChannel.editSuggestion(interaction, {
						body: interaction.options.getString("suggestion"),
						title,
						category: interaction.options.getString("category"),
					})
				)
					interaction.reply({
						content:
							"<:yes:940054094272430130> Successfully edited suggestion! " +
							(title
								? "If the thread title does not update immediately, you may have been ratelimited. I will automatically change the title once the rate limit is up (within the next hour)."
								: ""),
						ephemeral: true,
					});
				break;
			}
			case "get-top": {
				const deferPromise = interaction.deferReply();
				/** @type {[string, string][]} */
				const SUGGESTION_EMOJIS = [
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

				const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
				if (!channel?.isText()) return;
				const [, unfiltered] = await Promise.all([deferPromise, getAllMessages(channel)]);

				const all = (
					await Promise.all(
						unfiltered.map(async (message) => {
							const count = SUGGESTION_EMOJIS.map(([upvote, downvote]) => {
								const upvoteReaction = message.reactions.resolve(upvote);
								const downvoteReaction = message.reactions.resolve(downvote);

								if (!upvoteReaction || !downvoteReaction) return;

								return (upvoteReaction.count || 0) - (downvoteReaction.count || 0);
							}).find((count) => typeof count === "number");
							if (typeof count !== "number") return;

							const description =
								message.embeds[0]?.title ||
								message.embeds[0]?.description ||
								message.content;

							const authorTag = message.embeds[0]?.author?.name.split(/#| /g).at(-2);
							const author = (
								message.author.id === "323630372531470346" && authorTag
									? await interaction.guild?.members.search({ query: authorTag })
									: (
											await message.thread?.messages.fetch({
												limit: 2,
												after: (
													await message.thread.fetchStarterMessage()
												).id,
											})
									  )?.first()?.mentions.users
							)?.first();
							const requestedUser = interaction.options.getUser("user")?.id;
							if (requestedUser && author?.id !== requestedUser) return;

							const answer =
								message.thread?.name.split("|")[0]?.trim() || "Unanswered";
							const requestedAnswer = interaction.options.getString("answer");
							if (requestedAnswer && answer !== requestedAnswer) return;

							return {
								id: message.id,
								count,
								title: truncateText(
									description.split("/n")[0] || "",
									MAX_TITLE_LENGTH,
								),
								answer,
								author: author?.toString(),
							};
						}),
					)
				)
					.filter((a) => a)
					.sort((a, b) => (b?.count || 0) - (a?.count || 0));

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

				let offset = 0;
				/**
				 * @returns {Promise<
				 * 	MessagePayload | import("discord.js").InteractionReplyOptions
				 * >}
				 */
				async function embed() {
					const content = all
						.filter((x, i) => x && i >= offset && i < offset + PAGE_OFFSET)
						.map((x, i) => {
							if (!x) return; // impossible

							return (
								`${i + offset + 1}. **${x.count}** [👍 ${
									x.title
								}](https://discord.com/channels/${
									process.env.GUILD_ID
								}/${SUGGESTION_CHANNEL}/${x.id} "${x.answer}")` +
								(x.author ? ` by ${x.author}` : ``)
							);
						})
						.join("\n")
						.trim();
					if (!content.length)
						return {
							content:
								"<:no:940054047854047282> No suggestions found. Try changing any filters you may have used.",
							ephemeral: true,
						};
					return {
						embeds: [
							new MessageEmbed()
								.setTitle("Top suggestions")
								.setDescription(content)
								.setFooter({
									text: `Page ${
										Math.floor(offset / PAGE_OFFSET) + 1
									}/${numberOfPages}`,
								})
								.setColor("BLURPLE"),
						],
						components: [
							new MessageActionRow().addComponents(previousButton, nextButton),
						],
					};
				}

				interaction.editReply(await embed());

				const collector = interaction.channel.createMessageComponentCollector({
					filter: (i) =>
						[previousButton.customId, nextButton.customId].includes(i.customId) &&
						i.user.id === interaction.user.id,
					time: 15_000,
				});

				collector
					.on("collect", async (i) => {
						if (!interaction.channel?.isText()) return;
						if (i.customId === nextButton.customId) {
							offset += PAGE_OFFSET;
						} else {
							offset -= PAGE_OFFSET;
						}
						previousButton.setDisabled(offset === 0);
						nextButton.setDisabled(offset + PAGE_OFFSET >= all.length - 1);
						interaction.editReply(await embed());
						i.deferUpdate();
						collector.resetTimer();
					})
					.on("end", async () => {
						previousButton.setDisabled(true);
						nextButton.setDisabled(true);
						interaction.editReply({
							embeds: (await interaction.fetchReply()).embeds.map(
								(oldEmbed) => new MessageEmbed(oldEmbed),
							),
							components: [
								new MessageActionRow().addComponents(previousButton, nextButton),
							],
						});
					});
			}
		}
	},
};

export default info;
