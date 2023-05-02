import { ChatInputCommandInteraction, GuildMember, hyperlink, User } from "discord.js";
import client from "../../client.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { paginate } from "../../util/discord.js";
import { escapeLinks } from "../../util/markdown.js";
import { getSettings } from "../settings.js";

export default async function getTop(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const authorFilter = interaction.options.getMember("user");
	const answerFilter = interaction.options.getString("answer");
	const { suggestions } = CONSTANTS.channels;
	const useMentions = getSettings(interaction.user).useMentions;

	const nick =
		authorFilter instanceof GuildMember ? authorFilter.displayName : authorFilter?.nick;

	await paginate(
		[...(await oldSuggestions), ...suggestionsDatabase.data]
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
