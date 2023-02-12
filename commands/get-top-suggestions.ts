import {
	ApplicationCommandOptionType,
	cleanContent,
	GuildMember,
	hyperlink,
	Snowflake,
	User,
} from "discord.js";

import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import Database from "../common/database.js";
import { defineCommand } from "../common/types/command.js";
import { getAllMessages, paginate } from "../util/discord.js";
import { escapeLinks } from "../util/markdown.js";
import { truncateText } from "../util/text.js";
import { userSettingsDatabase } from "./settings.js";

export const suggestionAnswers = [
	"Unanswered",
	"Good Idea",
	"Implemented",
	"In Development",
	"Incompatible",
	"Impractical",
	"Rejected",
	"Impossible",
] as const;

export const suggestionsDatabase = new Database<{
	answer: typeof suggestionAnswers[number];
	author: string;
	count: number;
	id: Snowflake;
	title: string;
}>("suggestions");
await suggestionsDatabase.init();

const old = CONSTANTS.channels.old_suggestions
	? getAllMessages(CONSTANTS.channels.old_suggestions).then((suggestions) =>
			suggestions.map((message) => {
				const [embed] = message.embeds;

				const segments = message.thread?.name.split(" | ");

				return {
					answer:
						suggestionAnswers.find((answer) =>
							[
								segments?.[0]?.toLowerCase(),
								segments?.at(-1)?.toLowerCase(),
							].includes(answer.toLowerCase()),
						) ?? suggestionAnswers[0],

					author:
						(message.author.id === CONSTANTS.robotop
							? message.embeds[0]?.footer?.text.split(": ")[1]
							: (message.embeds[0]?.author?.iconURL ?? "").match(/\/(?<userId>\d+)\//)
									?.groups?.userId) ?? message.author,

					count:
						(message.reactions.valueOf().first()?.count ?? 0) -
						(message.reactions.valueOf().at(1)?.count ?? 0),

					title: truncateText(
						embed?.title ??
							(embed?.description &&
								cleanContent(embed.description, message.channel)) ??
							embed?.image?.url ??
							message.content,
						100,
					),

					url: message.url,
				};
			}),
	  )
	: [];

const command = defineCommand({
	data: {
		description: "Get the top suggestions",

		options: {
			answer: {
				choices: Object.fromEntries(suggestionAnswers.map((answer) => [answer, answer])),
				description: "Filter suggestions to only get those with a certain answer",
				type: ApplicationCommandOptionType.String,
			},

			user: {
				description: "Filter suggestions to only get those by a certain user",
				type: ApplicationCommandOptionType.User,
			},
		},
	},

	async interaction(interaction) {
		const authorFilter = interaction.options.getMember("user");
		const answerFilter = interaction.options.getString("answer");
		const { suggestions } = CONSTANTS.channels;
		const useMentions =
			userSettingsDatabase.data.find((settings) => interaction.user.id === settings.user)
				?.useMentions ?? false;

		const nick =
			authorFilter instanceof GuildMember ? authorFilter.displayName : authorFilter?.nick;

		await paginate(
			[...(await old), ...suggestionsDatabase.data]
				.filter(
					({ answer, author }) =>
						!(
							(answerFilter && answer !== answerFilter) ||
							(authorFilter instanceof GuildMember &&
								(author instanceof User ? author.id : author) !== authorFilter.id)
						),
				)
				.sort((suggestionOne, suggestionTwo) => suggestionTwo.count - suggestionOne.count),
			async ({ answer, author, count, title, ...id }) =>
				`**${count}** ${
					"url" in id
						? "👍"
						: suggestions?.defaultReactionEmoji?.name ??
						  `<:${suggestions?.defaultReactionEmoji?.name}:${suggestions?.defaultReactionEmoji?.id}>`
				} ${hyperlink(
					escapeLinks(title),
					"url" in id
						? id.url
						: `https://discord.com/channels/${CONSTANTS.guild.id}/${id.id}/${id.id}`,
					answer,
				)}${
					nick
						? ""
						: ` by ${
								useMentions
									? `<@${author instanceof User ? author.id : author}>`
									: (author instanceof User
											? author
											: await client.users
													.fetch(author)
													.catch(() => ({ username: `<@${author}>` }))
									  ).username
						  }`
				}`,
			async (data) => await interaction[interaction.replied ? "editReply" : "reply"](data),
			{
				title: `Top suggestions${nick ? ` by ${nick}` : ""}${
					answerFilter ? `${nick ? " &" : ""} answered with ${answerFilter}` : ""
				}`,

				user: interaction.user,
				format: authorFilter instanceof GuildMember ? authorFilter : undefined,

				singular: "suggestion",
				failMessage: "No suggestions found! Try changing any filters you may have used.",
			},
		);
	},
});
export default command;
