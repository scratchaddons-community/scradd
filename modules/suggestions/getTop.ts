import {
	ChatInputCommandInteraction,
	cleanContent,
	GuildMember,
	hyperlink,
	User,
} from "discord.js";
import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { getAllMessages, paginate } from "../../util/discord.js";
import { escapeLinks } from "../../util/markdown.js";
import { truncateText } from "../../util/text.js";
import { getSettings } from "../settings.js";
import { suggestionAnswers, suggestionsDatabase } from "./index.js";

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
						(message.author.id === "323630372531470346"
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

export default async function getTop(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const authorFilter = interaction.options.getMember("user");
	const answerFilter = interaction.options.getString("answer");
	const { suggestions } = CONSTANTS.channels;
	const useMentions = getSettings(interaction.user).useMentions;

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
		async ({ answer, author, count, title, ...ref }) =>
			`**${count}** ${
				"url" in ref
					? "👍"
					: suggestions?.defaultReactionEmoji?.name ??
					  `<:_:${suggestions?.defaultReactionEmoji?.id}>`
			} ${hyperlink(
				escapeLinks(`${title}`),
				"url" in ref
					? ref.url
					: `https://discord.com/channels/${CONSTANTS.guild.id}/${ref.id}/${ref.id}`,
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
}
