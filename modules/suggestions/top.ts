import { GuildMember, hyperlink, User, type RepliableInteraction } from "discord.js";
import config from "../../common/config.js";
import { paginate } from "../../util/discord.js";
import { mentionUser } from "../settings.js";
import { oldSuggestions, suggestionsDatabase } from "./misc.js";

export default async function top(
	interaction: RepliableInteraction,
	options: { user?: User | GuildMember; answer?: string },
) {
	const { suggestions } = config.channels;

	await paginate(
		[...oldSuggestions, ...suggestionsDatabase.data]
			.filter(
				({ answer, author }) =>
					!(
						(options.answer && answer !== options.answer) ||
						(options.user &&
							(author instanceof User ? author.id : author) !== options.user.id)
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
				"url" in reference
					? reference.url
					: `https://discord.com/channels/${config.guild.id}/${reference.id}`,
				answer,
			)}${options.user ? "" : ` by ${await mentionUser(author, interaction.user)}`}`,
		(data) => interaction.reply(data),
		{
			title: `Top suggestions${options.user ? ` by ${options.user.displayName}` : ""}${
				options.answer
					? `${options.user ? " and" : ""} answered with ${options.answer}`
					: ""
			}`,
			format: options.user instanceof GuildMember ? options.user : undefined,
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
