import type { ChatInputCommandInteraction, Snowflake, User } from "discord.js";

import { inlineCode } from "discord.js";
import { client } from "strife.js";

import config from "../../common/config.js";
import constants from "../../common/constants.js";
import pkg from "../../package.json" with { type: "json" };
import { columnize } from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import { mentionUser } from "../settings.js";

const designers = "966174686142672917",
	developers = "938439909742616616",
	testers = "938440159102386276";

const dependencies = await Promise.all(
	Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies }).map(async (name) => {
		const { default: dep } = (await import(`../../../node_modules/${name}/package.json`, {
			assert: { type: "json" },
		})) as { default: { name: string; version: `${bigint}.${bigint}.${string}` } };

		return [
			`${inlineCode(dep.name)}@${dep.version}`,
			`${constants.domains.npm}/${dep.name}/v/${dep.version}`,
		] as const;
	}),
);

export default async function credits(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.reply({
		embeds: [
			{
				title: "Credits",
				description: `Scradd is hosted on [Railway](${constants.urls.railway}) using Node.JS ${process.version}.`,

				fields: [
					{ name: "🧑‍💻 Developers", value: await getRole(developers), inline: true },
					{ name: "🖌️ Designers", value: await getRole(designers), inline: true },
					{
						name: "🧪 Additional beta testers",
						value: await getRole(testers),
						inline: true,
					},
					...(await columnize(
						dependencies.toSorted(([one], [two]) => one.localeCompare(two)),
						([specifier, link]) => `- [${specifier}](${link})`,
						"🗄️ Third-party code libraries",
					)),
				],

				color: constants.themeColor,
			},
		],
	});

	async function getRole(roleId: Snowflake): Promise<string> {
		const role = await config.guilds.testing.roles?.fetch(roleId);
		const members: { user: User }[] = [...(role?.members.values() ?? [])];
		if (roleId === designers)
			members.push({ user: await client.users.fetch(constants.users.weirdo) });

		const mentions = members
			.toSorted((one, two) => one.user.displayName.localeCompare(two.user.displayName))
			.map(({ user }) => mentionUser(user, interaction.user));
		return joinWithAnd(await Promise.all(mentions));
	}
}
