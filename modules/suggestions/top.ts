import { ChatInputCommandInteraction, GuildMember, hyperlink, User } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import { paginate } from "../../util/discord.js";
import { getSettings } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";

export default async function top(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	options: { user?: User | GuildMember; answer?: string },
) {
	const { suggestions } = config.channels;
	const { useMentions } = getSettings(interaction.user);

	await paginate(
		[...oldSuggestions, ...suggestionsDatabase.data]
			.filter(
				({ answer, author }) =>
					!(
						(options.answer && answer !== options.answer) ||
						(options.user instanceof GuildMember &&
							(author instanceof User ? author.id : author) !== options.user.id)
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
				options.user?.displayName
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
			title: `Top suggestions${
				options.user?.displayName ? ` by ${options.user.displayName}` : ""
			}${
				options.answer
					? `${options.user?.displayName ? " and" : ""} answered with ${options.answer}`
					: ""
			}`,
			format: options.user instanceof GuildMember ? options.user : undefined,
			singular: "suggestion",
			failMessage: "No suggestions found! Try changing any filters you may have used.",
			user: interaction.user,
		},
	);
}
