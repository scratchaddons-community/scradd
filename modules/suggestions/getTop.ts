import { ChatInputCommandInteraction, GuildMember, hyperlink, User } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { paginate } from "../../util/discord.js";
import { getSettings } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";

export default async function getTop(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	const authorFilter = interaction.options.getMember("user");
	const answerFilter = interaction.options.getString("answer");
	const { suggestions } = config.channels;
	const useMentions = getSettings(interaction.user).useMentions;

	const nick =
		authorFilter instanceof GuildMember ? authorFilter.displayName : authorFilter?.nick;

	await paginate(
		[...oldSuggestions, ...suggestionsDatabase.data]
			.filter(
				({ answer, author }) =>
					!(
						(answerFilter && answer !== answerFilter) ||
						(authorFilter instanceof GuildMember &&
							(author instanceof User ? author.id : author) !== authorFilter.id)
					),
			)
			.sort((suggestionOne, suggestionTwo) => suggestionTwo.count - suggestionOne.count),
		async ({ answer, author, count, title, ...reference }) =>
			`**${count}** ${
				"url" in reference
					? "👍"
					: suggestions?.defaultReactionEmoji?.name ??
					  `<:_:${suggestions?.defaultReactionEmoji?.id}>`
			} ${hyperlink(
				`${title}`,
				"url" in reference
					? reference.url
					: `https://discord.com/channels/${config.guild.id}/${reference.id}/${reference.id}`,
				answer,
			)}${
				nick
					? ""
					: ` by ${
							useMentions
								? author instanceof User
									? author.toString()
									: `<@${author}>`
								: (author instanceof User
										? author
										: await client.users
												.fetch(author)
												.catch(() => ({ displayName: `<@${author}>` }))
								  ).displayName
					  }`
			}`,
		(data) => interaction.reply(data),
		{
			title: `Top suggestions${nick ? ` by ${nick}` : ""}${
				answerFilter ? `${nick ? " and" : ""} answered with ${answerFilter}` : ""
			}`,
			format: authorFilter instanceof GuildMember ? authorFilter : undefined,
			singular: "suggestion",
			failMessage: "No suggestions found! Try changing any filters you may have used.",
			user: interaction.user,
		},
	);
}
