import type { Snowflake } from "discord.js";

import config from "../../common/config.js";
import constants from "../../common/constants.js";

const scratchAddons = constants.repos.scratchAddons.split("/"),
	scradd = constants.repos.scradd.split("/");
const presets = {
	addons: scratchAddons,
	devtools: [scratchAddons[0], "DevtoolsExtension"],
	sa: scratchAddons,
	schema: [scratchAddons[0], "manifest-schema"],
	scradd: scradd,
	site: [scratchAddons[0], "website-v2"],
	userscript: [scradd[0], "userscript"],
} as const;
const presetOwners = {
	"addons": scratchAddons[0],
	"sa-com": scradd[0],
	"sa-community": scradd[0],
	"sacom": scradd[0],
	"scratchaddons-com": scradd[0],
	"sa": scratchAddons[0],
} as const;

export default function github(content: string, guildId?: Snowflake): string | undefined {
	const output = new Set<string>();
	for (const match of content.matchAll(
		/(?:^|\s)(?:(?:(?<owner>[\w.-]+)\/)?(?<repo>[\w.-]+))?#0*(?<issue>[1-9]\d*)\b/gi,
	)) {
		const { owner, repo, issue } = match.groups ?? {};
		if (!issue || (issue.length === 1 && !repo)) continue;

		const lowercasedOwner = owner?.toLowerCase();
		const resolvedOwner =
			lowercasedOwner && Object.keys(presetOwners).includes(lowercasedOwner) ?
				presetOwners[lowercasedOwner]
			:	owner;

		const lowercasedRepo = repo?.toLowerCase();
		if (lowercasedRepo && Object.keys(presets).includes(lowercasedRepo)) {
			const [presetOwner, presetRepo] = presets[lowercasedRepo];
			if (!resolvedOwner || resolvedOwner === presetOwner) {
				output.add(`https://github.com/${presetOwner}/${presetRepo}/issues/${issue}`);
				continue;
			}
		}

		const resolvedPath =
			!repo && guildId === config.guilds.testing.id ?
				constants.repos.scradd
			:	`${resolvedOwner ?? scratchAddons[0]}/${repo ?? scratchAddons[1] ?? scratchAddons[0]}`;
		output.add(`https://github.com/${resolvedPath}/issues/${issue}`);
	}
	return [...output].slice(0, 5).join(" ");
	// TODO: Verify the link doesn't already exist in the OG content, also the Set is case-sensitive
}
