import { SlashCommandBuilder } from "@discordjs/builders";
import SuggestionBuilder from "../common/suggest.js";
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import getAllMessages from "../lib/getAllMessages.js";
import generateHash from "../lib/generateHash.js";
import dotenv from "dotenv";
import truncateText from "../lib/truncateText.js";

dotenv.config();
const { SUGGESTION_CHANNEL } = process.env;
if (!SUGGESTION_CHANNEL) throw new Error("SUGGESTION_CHANNEL is not set in the .env.");
const PAGE_OFFSET = 5;

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
				const res = await SuggestionChannel.createMessage(interaction, {
					title: interaction.options.getString("title") || "",
					description: interaction.options.getString("suggestion") || "",
				});
				if (res) {
					await Promise.all([
						res.message.react("👍").then(() => res.message.react("👎")),
						interaction.reply({
							content: `:white_check_mark: Suggestion posted! See ${res.thread}`,
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
				console.log(unfiltered.length);

				const all = unfiltered
					.map((message) => {
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
						console.log(truncateText(description, 20));
						return {
							id: message.id,
							count: count,
							title: truncateText(description, 20),
							thread: message.thread,
							author: message.embeds[0]?.author?.name.split(/#| /).at(-2),
						};
					})
					.filter((a) => a)
					.sort((a, b) => (b?.count || 0) - (a?.count || 0));

				if (!interaction.channel?.isText()) return;

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
				const embed = async () => {
					const content = all
						.filter((x, i) => x && i >= offset && i < offset + PAGE_OFFSET)
						.map(async (x, i) => {
							if (!x) return; // impossible
							const author =
								(
									await x.thread?.messages.fetch({
										limit: 2,
										after: (await x.thread.fetchStarterMessage()).id,
									})
								)
									?.first()
									?.mentions.users.first()
									?.toString() ||
								(x.author &&
									(await interaction.guild?.members.search({ query: x.author }))
										?.first()
										?.toString());
							console.log(x.thread?.name.split("|")[0]);
							return (
								`${i + offset + 1}. **${x.count}** [👍 ${
									x.title
								}](https://discord.com/channels/${
									process.env.GUILD_ID
								}/${SUGGESTION_CHANNEL}/${x.id} "${x.thread?.name
									.split("|")[0]
									?.trim()}")` + (author ? ` by ${author}` : ``)
							);
						});

					return new MessageEmbed()
						.setTitle("Top suggestions")
						.setDescription((await Promise.all(content)).join("\n"))
						.setFooter({
							text: `Page ${Math.floor(offset / PAGE_OFFSET) + 1}/${numberOfPages}`,
						});
				};

				interaction.editReply({
					embeds: [await embed()],
					components: [new MessageActionRow().addComponents(previousButton, nextButton)],
				});

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
