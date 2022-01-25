import { SlashCommandBuilder } from "@discordjs/builders";
import SuggestionBuilder from "../common/suggest.js";
import { MessageActionRow, MessageButton, MessageEmbed, ReactionManager } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import generateHash from "../lib/generateHash.js";
import dotenv from "dotenv";

dotenv.config();
const { SUGGESTION_CHANNEL } = process.env;
if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
const PAGE_OFFSET = 15;

const ANSWERS = {
	GOODIDEA: "Good Idea",
	INDEVELOPMENT: "In Development",
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
		.setDescription("Manage and create suggestions in #suggestions")
		.addSubcommand((subcommand) =>
			subcommand
				.setName("create")
				.setDescription("Create a new suggestion")
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
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("answer")
				.setDescription("(Devs Only) Answer a suggestion")
				.addStringOption((option) =>
					option
						.setName("answer")
						.setDescription("Answer to the suggestion")
						.addChoice(ANSWERS.GOODIDEA, ANSWERS.GOODIDEA)
						.addChoice(ANSWERS.INDEVELOPMENT, ANSWERS.INDEVELOPMENT)
						.addChoice(ANSWERS.IMPLEMENTED, ANSWERS.IMPLEMENTED)
						.addChoice(ANSWERS.POSSIBLE, ANSWERS.POSSIBLE)
						.addChoice(ANSWERS.IMPRACTICAL, ANSWERS.IMPRACTICAL)
						.addChoice(ANSWERS.REJECTED, ANSWERS.REJECTED)
						.addChoice(ANSWERS.IMPOSSIBLE, ANSWERS.IMPOSSIBLE)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("delete").setDescription("Delete a suggestion"),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName("edit")
				.setDescription("Edit a suggestion")
				.addStringOption((option) =>
					option
						.setName("suggestion")
						.setDescription("Your updated suggestion")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName("get-top").setDescription("Get the top suggestions"),
		),

	async interaction(interaction) {
		if (interaction.guild?.id !== process.env.GUILD_ID) return;
		const command = interaction.options.getSubcommand();
		switch (command) {
			case "create": {
				const { thread, message } = await SuggestionChannel.createMessage(interaction, {
					title: interaction.options.getString("title") || "",
					description: interaction.options.getString("suggestion") || "",
				});
				await Promise.all([
					message.react("👍").then(() => message.react("👎")),
					interaction.reply({
						content: `:white_check_mark: Suggestion posted! See ${thread}`,
						ephemeral: true,
					}),
				]);
				break;
			}
			case "answer": {
				const answer = interaction.options.getString("answer");
				if (
					await SuggestionChannel.answerSuggestion(interaction, answer || "", {
						[ANSWERS.GOODIDEA]: "GREEN",
						[ANSWERS.INDEVELOPMENT]: "YELLOW",
						[ANSWERS.IMPLEMENTED]: "BLUE",
						[ANSWERS.POSSIBLE]: "ORANGE",
						[ANSWERS.IMPRACTICAL]: "DARK_RED",
						[ANSWERS.REJECTED]: "RED",
						[ANSWERS.IMPOSSIBLE]: "PURPLE",
					})
				)
					interaction.reply({
						content: `:white_check_mark: Answered suggestion as ${answer}! Please elaborate on your answer below.`,
						ephemeral: true,
					});
				break;
			}
			case "delete": {
				await SuggestionChannel.deleteSuggestion(interaction);
				break;
			}
			case "edit": {
				if (
					await SuggestionChannel.editSuggestion(
						interaction,
						interaction.options.getString("suggestion") || "",
					)
				)
					interaction.reply({
						content: "Sucessfully editted suggestion.",
						ephemeral: true,
					});
				break;
			}
			case "get-top": {
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

				/**
				 * @param {ReactionManager} reactions
				 * @param {...string} emojis
				 */
				function getReactions(reactions, ...emojis) {
					const foundEmojis = emojis
						.map((emoji) => reactions.resolve(emoji)?.count)
						.filter((emoji) => emoji && emoji > 0);
					if (emojis.length === foundEmojis.length)
						return foundEmojis.reduce((acc, curr) => (acc || 0) - (curr || 0)) || 0;
					else return false;
				}

				const channel = await interaction.guild?.channels.fetch(SUGGESTION_CHANNEL);
				if (!channel?.isText()) return;
				const all = (
					await Promise.all(
						(
							await getAllMessages(
								channel,
								(message) => !!message.reactions.valueOf().size,
							)
						).map(async (message) => {
							const getReaction = message.reactions;
							const count = SUGGESTION_EMOJIS.map(([upvote, downvote]) =>
								getReactions(getReaction, upvote, downvote),
							).filter((count) => typeof count === "number")[0];
							const description =
								message.embeds[0]?.title || message.embeds[0]?.description || "";
							return {
								id: message.id,
								count: typeof count === "undefined" ? false : count,
								title:
									description.length < 50
										? description
										: description.substring(0, 50 - 3) + "…",
								thread: message.thread,
								author: message.embeds[0]?.author?.name.split(/#| /).at(-2),
							};
						}),
					)
				)
					.filter((info) => typeof info.count === "number")
					.sort((a, b) => +b.count - +a.count);

				if (!interaction.channel?.isText()) return;

				const previousButton = new MessageButton()
					.setLabel("<< Previous")
					.setStyle("PRIMARY")
					.setDisabled(true)
					.setCustomId(generateHash("previous"));
				const nextButton = new MessageButton()
					.setLabel("Next >>")
					.setStyle("PRIMARY")
					.setCustomId(generateHash("next"));

				let offset = 0;
				const embed = async () => {
					const content = all
						.filter((_, i) => i > offset && i <= offset + PAGE_OFFSET)
						.map(async (x, i) => {
							const author =
								(x.thread &&
									(
										await x.thread?.messages.fetch({
											limit: 2,
											after: (await x.thread.fetchStarterMessage()).id,
										})
									)
										?.first()
										?.mentions.users.first()
										?.toString()) ||
								(x.author &&
									(await interaction.guild?.members.search({ query: x.author }))
										?.first()
										?.toString());
							return (
								`${i + offset + 1}. **${x.count}** [👍 ${
									x.title
								}](https://discord.com/channels/${
									process.env.GUILD_ID
								}/${SUGGESTION_CHANNEL}/${x.id})` + (author ? ` by ${author}` : ``)
							);
						});

					return new MessageEmbed()
						.setTitle("Top suggestions")
						.setDescription((await Promise.all(content)).join("\n"))
						.setFooter({
							text: `Page ${Math.floor(offset / PAGE_OFFSET) + 1}/${Math.ceil(
								all.length / PAGE_OFFSET,
							)}`,
						});
				};

				interaction.reply({
					embeds: [await embed()],
					components: [new MessageActionRow().addComponents(previousButton, nextButton)],
				});

				const collector = interaction.channel.createMessageComponentCollector({
					filter: (i) =>
						[previousButton.customId, nextButton.customId].includes(i.customId) &&
						i.user.id === interaction.user.id,
					time: 10_000,
				});

				collector
					.on("collect", async (i) => {
						if (!interaction.channel?.isText()) return;
						if (i.customId === nextButton.customId) {
							offset += PAGE_OFFSET;
						} else {
							offset -= PAGE_OFFSET;
						}
						if (offset === 0) previousButton.setDisabled(true);
						else previousButton.setDisabled(false);
						if (offset + PAGE_OFFSET >= all.length - 1) nextButton.setDisabled(true);
						else nextButton.setDisabled(false);
						interaction.editReply({
							embeds: [await embed()],
							components: [
								new MessageActionRow().addComponents(previousButton, nextButton),
							],
						});
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
