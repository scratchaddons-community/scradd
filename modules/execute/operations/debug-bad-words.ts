import type { CustomOperation } from "../util.js";

import assert from "node:assert";

import { ApplicationCommandOptionType, GuildMember, User } from "discord.js";

import config from "../../../common/config.js";
import constants from "../../../common/constants.js";
import { caesar } from "../../../util/text.js";
import badWords from "../../automod/bad-words.js";
import { decodeRegexp, regexpFlags } from "../../automod/misc.js";

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
			!!user.roles.resolve(config.roles.mod.id)
		:	user.roles.includes(config.roles.mod.id)) &&
		undefined,

	async command(interaction, { string }) {
		assert(typeof string === "string");

		const matches = badWords
			.flatMap((severityList: RegExp[][], severity: number) =>
				severityList.flatMap((regexps: RegExp[]) =>
					regexps.map((regexp) => {
						const start = severity === 1 || severity === 2 ? "" : /\b/.source;
						const end = severity === 1 ? "" : /\b/.source;
						const actual = `${start}${caesar(regexp.source)}${end}`;
						if (new RegExp(actual, regexpFlags).test(string))
							return { regexp: regexp.source, raw: true, actual };
						if (
							new RegExp(`${start}${decodeRegexp(regexp)}${end}`, regexpFlags).test(
								string,
							)
						)
							return { regexp: regexp.source, raw: false, actual };
					}),
				),
			)
			.filter(Boolean)
			.sort((a, b) => +b.raw - +a.raw || a.regexp.localeCompare(b.regexp));

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
						`- [\`/${match.regexp}/\`](<https://regex101.com/?${new URLSearchParams({
							flavor: "javascript",
							regex: match.actual,
							testString: string,
							delimiter: "/",
							flags: regexpFlags,
						}).toString()}>)`
					:	`- \`/${match.regexp}/\`*`,
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
