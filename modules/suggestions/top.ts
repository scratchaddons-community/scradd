import { ChatInputCommandInteraction, GuildMember, hyperlink, User } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { paginate } from "../../util/discord.js";
import { getSettings } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";

export default async function top(
	interaction: ChatInputCommandInteraction,
	options: { user?: User | GuildMember; answer?: string },
) {
	const { suggestions } = config.channels;
	const { useMentions } = getSettings(interaction.user);
	const user = options.user instanceof GuildMember ? options.user.user : options.user;

	await paginate(
		[...oldSuggestions, ...suggestionsDatabase.data]
			.filter(
				({ answer, author }) =>
					!(
						(options.answer && answer !== options.answer) ||
						(user && (author instanceof User ? author.id : author) !== user.id)
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
					: `https://discord.com/channels/${config.guild.id}/${reference.id}`,
				answer,
			)}${
				user
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
			title: `Top suggestions${user ? ` by ${user.displayName}` : ""}${
				options.answer && user ? " and" : ""
			}${options.answer ? ` answered with ${options.answer}` : ""}`,
			singular: "suggestion",
			failMessage: "No suggestions found! Try changing any filters you may have used.",
			user: interaction.user,
		},
	);
}
