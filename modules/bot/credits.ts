import type { APIEmbedField, ChatInputCommandInteraction, Snowflake, User } from "discord.js";

import { inlineCode } from "discord.js";
import { client, columnize } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import pkg from "../../package.json" with { type: "json" };
import { joinWithAnd } from "../../util/text.ts";
import { mentionUser } from "../settings.ts";

const designers = "966174686142672917",
	developers = "938439909742616616",
	testers = "938440159102386276";

const dependencyColumns = await getDependencies();

export default async function credits(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.reply({
		embeds: [
			{
				title: "Credits",
				description: `${client.user.displayName} is hosted on [Railway](${
					constants.urls.railway
				}) using Node.JS ${process.version}.`,

				fields: [
					{ name: "🧑‍💻 Developers", value: await getRole(developers), inline: true },
					{ name: "🖌️ Designers", value: await getRole(designers), inline: true },
					{
						name: "🧪 Additional beta testers",
						value: await getRole(testers),
						inline: true,
					},
					...dependencyColumns,
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

async function getDependencies(): Promise<APIEmbedField[]> {
	const dependencyNames = Object.keys({ ...pkg.dependencies, ...pkg.optionalDependencies });
	const promises = dependencyNames.map((name) =>
		import(`../../../node_modules/${name}/package.json`, { assert: { type: "json" } }).then(
			(dependency: { default: { name: string; version: `${bigint}.${bigint}.${string}` } }) =>
				`- [${inlineCode(dependency.default.name)}@${
					dependency.default.version
				}](https://npmjs.com/package/${dependency.default.name}/v/${
					dependency.default.version
				})`,
			() => void 0,
		),
	);
	const dependencies = (await Promise.all(promises))
		.filter(Boolean)
		.toSorted((one, two) => one.localeCompare(two));
	return columnize(dependencies, "🗄️ Third-party code libraries");
}
