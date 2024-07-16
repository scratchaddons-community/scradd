import { ApplicationCommandOptionType, GuildMember, User } from "discord.js";
import type { CustomOperation } from "../util.js";
import badWords from "../../automod/bad-words.js";
import { caesar } from "../../../util/text.js";
import { decodeRegexp, regexpFlags } from "../../automod/misc.js";
import assert from "node:assert";
import constants from "../../../common/constants.js";
import config from "../../../common/config.js";

const data: CustomOperation = {
	name: "debug-bad-words",
	description: "Detect which regular expressions flag a string as inappropriate",
	censored: false,
	options: [
		{
			type: ApplicationCommandOptionType.String,
			name: "string",
			description: "The string to check",
			required: true,
		},
	],
	permissions: (user) =>
		!(user instanceof User) &&
		(user instanceof GuildMember ?
			!!user.roles.resolve(config.roles.staff.id)
		:	user.roles.includes(config.roles.staff.id)) &&
		undefined,

	async command(interaction, { string }) {
		assert(typeof string === "string");

		const matches = badWords
			.flatMap((severityList: RegExp[][], severity: number) =>
				severityList.flatMap((regexes: RegExp[]) =>
					regexes.map((regex) => {
						const start = severity === 1 || severity === 2 ? "" : /\b/.source;
						const end = severity === 1 ? "" : /\b/.source;
						const actual = `${start}${caesar(regex.source)}${end}`;
						if (new RegExp(actual, regexpFlags).test(string))
							return { regex: regex.source, raw: true, actual };
						if (
							new RegExp(`${start}${decodeRegexp(regex)}${end}`, regexpFlags).test(
								string,
							)
						)
							return { regex: regex.source, raw: false, actual };
					}),
				),
			)
			.filter(Boolean)
			.sort((a, b) => +b.raw - +a.raw || a.regex.localeCompare(b.regex));

		if (!matches.length) {
			await interaction.reply({
				content: `${constants.emojis.statuses.no} No regular expressions matched \`${string}\`.`,
				ephemeral: true,
			});
			return;
		}

		await interaction.reply({
			content: `${
				constants.emojis.statuses.yes
			} \`${string}\` matches the following regular expressions:\n${matches
				.map((match) =>
					match.raw ?
						`- [\`/${match.regex}/\`](<https://regex101.com/?${new URLSearchParams({
							flavor: "javascript",
							regex: match.actual,
							testString: string,
							delimiter: "/",
							flags: regexpFlags,
						}).toString()}>)`
					:	`- \`/${match.regex}/\`*`,
				)
				.join("\n")}${
				matches.some((match) => !match.raw) ?
					"\n\n*\\*Only matches after evasion restrictions are applied*"
				:	""
			}`,
			ephemeral: true,
		});
	},
};

export default data;
