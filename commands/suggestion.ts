import {
	SlashCommandBuilder,
	Colors,
	escapeMarkdown,
	cleanContent,
	GuildMember,
	EmbedBuilder,
	Message,
	Snowflake,
	User,
} from "discord.js";
import client, { guild } from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import giveXp from "../common/xp.js";
import { escapeLinks } from "../lib/markdown.js";
import { getAllMessages, paginate, reactAll } from "../lib/discord.js";
import { truncateText } from "../lib/text.js";
import type { ChatInputCommand } from "../common/types/command.js";

export const SUGGESTION_EMOJIS: [string, string][] = [
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
] as const;

const RATELIMIT_TIMEOUT = 3_000;

const RATELIMT_MESSAGE =
	"If the thread title doesn’t update immediately, you may have been ratelimited. I will automatically change the title once the ratelimit is up (within the next hour).";

const cooldowns: { [key: Snowflake]: number } = {};
const COOLDOWN = 60_000;

/**
 * Get the member who made a suggestion.
 *
 * @param message - The message to get the member from.
 *
 * @returns The member who made the suggestion.
 */
async function getUserFromSuggestion(message: Message<true>): Promise<GuildMember | User> {
	const author =
		message.author.id === CONSTANTS.robotop
			? message.embeds[0]?.footer?.text.split(": ")[1]
			: /\/(?<userId>\d+)\//.exec(message.embeds[0]?.author?.iconURL ?? "")?.groups?.userId;

	if (author) {
		const fetchedMember =
			(await guild?.members.fetch(author).catch(() => undefined)) ||
			(await client?.users.fetch(author).catch(() => undefined));
		if (fetchedMember) return fetchedMember;
	}

	return message.member ?? message.author;
}

function parseSuggestionTitle(title: string) {
	const segments = title.split(" | ");
	const found = ANSWERS.find(({ name }) => name === segments[0]);
	if (found) {
		segments.shift();
		return { answer: found, name: segments.join(" | ") };
	} else {
		const found = ANSWERS.find(({ name }) => name === segments.at(-1));
		segments.pop();
		return { answer: found || ANSWERS[0], name: segments.join(" | ") };
	}
}

const CHANNEL_TAG = `#${CONSTANTS.channels.suggestions?.name}`;

const minDescLength = 30 * +(process.env.NODE_ENV === "production");

const info: ChatInputCommand = {
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
						.setMinLength(minDescLength),
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
						.setMinLength(minDescLength),
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
		if (!CONSTANTS.channels.suggestions)
			throw new ReferenceError("Could not find suggestions channel!");
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
				const author = interaction.member;

				if (!(author instanceof GuildMember))
					throw new TypeError("interaction.member must be a GuildMember");

				const title = escapeMarkdown(interaction.options.getString("title", true));

				const embed = new EmbedBuilder()
					.setColor(ANSWERS[0].color)
					.setAuthor({
						iconURL: author.displayAvatarURL(),
						name: author.displayName ?? interaction.user.username,
					})
					.setTitle(title)
					.setDescription(interaction.options.getString("suggestion", true))
					.setFooter({ text: ANSWERS[0].name });

				if ((cooldowns[author.id] || 0) > Date.now()) {
					return await interaction.reply({
						content: `${
							CONSTANTS.emojis.statuses.no
						} You can only post a suggestion every ${Math.max(
							1,
							Math.round(COOLDOWN / 1_000),
						)} seconds. Please wait ${Math.max(
							1,
							Math.round(((cooldowns[author.id] || 0) - Date.now()) / 1_000),
						)} seconds before posting another suggestion.`,
						ephemeral: true,
					});
				}
				cooldowns[author.id] = Date.now() + COOLDOWN;
				const message = await CONSTANTS.channels.suggestions.send({ embeds: [embed] });
				const thread = await message.startThread({
					name: `${title ?? ""} | Unanswered`,
					reason: `Suggestion by ${interaction.user.tag}`,
				});

				await Promise.all([
					thread.members.add(interaction.user.id),
					reactAll(message, SUGGESTION_EMOJIS[0] || []),
					giveXp(author),
					interaction.reply({
						content: `${CONSTANTS.emojis.statuses.yes} Suggestion posted! See ${
							message.thread?.toString() ?? ""
						}. If you made any mistakes, you can fix them with \`/suggestion edit\`.`,
						ephemeral: true,
					}),
				]);

				break;
			}
			case "answer": {
				const answer = interaction.options.getString("answer", true);
				if (
					!interaction.channel?.isThread() ||
					interaction.channel.parent?.id !== CONSTANTS.channels.suggestions?.id
				) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} This command can only be used in threads in ${CONSTANTS.channels.suggestions}.`,
						ephemeral: true,
					});

					return;
				}

				const starter = await interaction.channel.fetchStarterMessage().catch(() => {});
				if (!(interaction.member instanceof GuildMember))
					throw new TypeError("interaction.member must be a GuildMember");

				if (
					!CONSTANTS.roles.dev ||
					!interaction.member.roles.resolve(CONSTANTS.roles.dev.id)
				) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to run this command!`,
						ephemeral: true,
					});

					return;
				}

				const { name, answer: oldAnswer } = parseSuggestionTitle(interaction.channel.name);
				if (oldAnswer.name === answer) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} That's already the answer!`,
						ephemeral: true,
					});

					return;
				}

				const promises = [
					Promise.race([
						new Promise((resolve) => setTimeout(resolve, RATELIMIT_TIMEOUT)),
						interaction.channel.setName(
							(name ? name + " | " : "") + answer,
							`Suggestion answered by ${interaction.user.tag}`,
						),
					]),
				];

				if (starter && starter?.author.id === client.user?.id) {
					const embed = starter.embeds[0]
						? EmbedBuilder.from(starter.embeds[0])
						: new EmbedBuilder();

					embed
						.setColor(
							ANSWERS.find(({ name }) => answer === name)?.color ?? ANSWERS[0].color,
						)
						.setFooter({ text: answer });

					promises.push(starter.edit({ embeds: [embed] }));
				}

				promises.push(
					interaction.reply({
						content:
							`${
								CONSTANTS.emojis.statuses.yes
							} Successfully answered suggestion as **${escapeMarkdown(
								answer,
							)}**! *${escapeMarkdown(
								ANSWERS.find(({ name }) => name === answer)?.description || "",
							)}*.` +
							(interaction.channel.name.startsWith(answer + " |")
								? ""
								: "\n" + RATELIMT_MESSAGE),

						ephemeral: false,
					}),
				);

				await Promise.all(promises);
				break;
			}
			case "edit": {
				const body = interaction.options.getString("suggestion"),
					title = escapeMarkdown(interaction.options.getString("title") ?? "");

				if (
					!interaction.channel?.isThread() ||
					interaction.channel.parent?.id !== CONSTANTS.channels.suggestions?.id
				) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} This command may only be used in threads in ${CONSTANTS.channels.suggestions}.`,
						ephemeral: true,
					});

					return false;
				}

				const starterMessage = await interaction.channel
					.fetchStarterMessage()
					.catch(() => {});

				if (!starterMessage || starterMessage.author.id !== client.user?.id) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} Cannot edit this suggestion.`,
						ephemeral: true,
					});

					return false;
				}
				const user = await getUserFromSuggestion(starterMessage);
				if (!(interaction.member instanceof GuildMember))
					throw new TypeError("interaction.member must be a GuildMember");

				const isMod =
					CONSTANTS.roles.mod && interaction.member.roles.resolve(CONSTANTS.roles.mod.id);
				if (interaction.user.id !== user?.id && (!isMod || (isMod && body))) {
					await interaction.reply({
						content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to use this command.`,
						ephemeral: true,
					});

					return false;
				}

				const embed = starterMessage.embeds[0]
					? EmbedBuilder.from(starterMessage.embeds[0])
					: new EmbedBuilder();

				if (body) embed.setDescription(body);

				const { answer } = parseSuggestionTitle(interaction.channel.name);

				await Promise.all([
					Promise.race([
						interaction.channel.setName(
							(title || embed.data.title) + " | " + answer.name,
							"Suggestion edited",
						),
						new Promise((resolve) => setTimeout(resolve, RATELIMIT_TIMEOUT)),
					]),
					starterMessage.edit({
						embeds: [embed.setTitle(title || embed.data.title || "")],
					}),
					interaction.reply({
						content: `${CONSTANTS.emojis.statuses.yes} Successfully edited suggestion!${
							title && (await interaction.channel.fetch()).name.endsWith(title)
								? " " + RATELIMT_MESSAGE
								: ""
						}`,

						ephemeral:
							interaction.user.id ===
							(
								await getUserFromSuggestion(starterMessage)
							).id,
					}),
				]);

				break;
			}
			case "get-top": {
				const requestedUser = interaction.options.getUser("user");
				const requestedAnswer = interaction.options.getString("answer");

				await interaction.deferReply();
				const unfiltered = await getAllMessages(CONSTANTS.channels.suggestions);
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

							const answer = message.thread
								? parseSuggestionTitle(message.thread.name).answer
								: ANSWERS[0];

							if (
								requestedAnswer &&
								answer.name.toLowerCase() !== requestedAnswer.toLowerCase()
							)
								return;
							const embed = message.embeds[0];
							const description =
								embed?.title ??
								(embed?.description &&
									cleanContent(embed?.description, message.channel)) ??
								(embed?.image?.url ? embed?.image?.url : message.content);

							const author = await getUserFromSuggestion(message);

							if (requestedUser && author?.id !== requestedUser?.id) return;
							return {
								answer: answer.name,
								author,
								count,
								url: message.url,

								title: truncateText(description, 100),
							};
						}),
					)
				)

					.filter(
						(suggestion): suggestion is NonNullable<typeof suggestion> =>
							suggestion !== undefined,
					)
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
export default info;
