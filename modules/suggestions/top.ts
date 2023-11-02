import { GuildMember, hyperlink, User, type RepliableInteraction, channelLink } from "discord.js";
import config from "../../common/config.js";
import { paginate } from "../../util/discord.js";
import { mentionUser } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";

export default async function top(
	interaction: RepliableInteraction,
	options: { user?: User | GuildMember; answer?: string },
) {
	const { suggestions } = config.channels;
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
			.toSorted((suggestionOne, suggestionTwo) => suggestionTwo.count - suggestionOne.count),
		async ({ answer, author, count, title, ...reference }) =>
			`**${count}** ${
				"old" in reference
					? "👍"
					: suggestions?.defaultReactionEmoji?.name ??
					  `<:_:${suggestions?.defaultReactionEmoji?.id}>`
			} ${hyperlink(
				padTitle(title),
				"url" in reference ? reference.url : channelLink(config.guild.id, reference.id),
				answer,
			)}${
				user
					? ""
					: ` by ${await mentionUser(
							author,
							interaction.user,
							interaction.guild ?? config.guild,
					  )}`
			}`,
		(data) => interaction.reply(data),
		{
			title: `Top suggestions${user ? ` by ${user.displayName}` : ""}${
				options.answer && user ? " and" : ""
			}${options.answer ? ` answered with ${options.answer}` : ""}`,
			format: user,
			singular: "suggestion",
			failMessage: "No suggestions found! Try changing any filters you may have used.",
			user: interaction.user,
			perPage: 15,
		},
	);
}
/** @todo - Strip full links, they can't be escaped. */
function padTitle(title: string | number) {
	const left = count(`${title}`, "[");
	const right = count(`${title}`, "]");
	return title + "]".repeat(Math.max(0, left - right));
}

function count(string: string, substring: string) {
	return string.split(substring).length - 1;
}
