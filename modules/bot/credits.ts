import {
	type Snowflake,
	type User,
	type ChatInputCommandInteraction,
	inlineCode,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import pkg from "../../package.json" assert { type: "json" };
import lockFile from "../../package-lock.json" assert { type: "json" };
import { joinWithAnd } from "../../util/text.js";
import { mentionUser } from "../settings.js";
import constants from "../../common/constants.js";
import { columns } from "../../util/discord.js";

const designers = "966174686142672917",
	developers = "938439909742616616",
	testers = "938440159102386276";

export default async function credits(interaction: ChatInputCommandInteraction): Promise<void> {
	const dependencies = Object.keys(pkg.dependencies)
		.map((name) => {
			const { version } = lockFile.dependencies[name];

			if (version.startsWith("file:")) return [name] as const;

			if (/^https?:\/\//.test(version)) return [name, version] as const;

			if (version.startsWith("git+")) {
				const segments = version.split("+")[1]?.split("#");
				return segments
					? ([`${name}${segments[1] ? `@${segments[1]}` : ""}`, segments[0]] as const)
					: ([name] as const);
			}
			if (version.startsWith("npm:")) {
				const segments = version.split("@");
				const reference = `${segments.length > 2 ? "@" : ""}${
					segments.at(-2) ?? segments[0]
				}`;
				return [
					`${reference}@${segments.at(-1) ?? segments[0]}`,
					`https://npm.im/${reference}`,
				] as const;
			}

			return [`${name}@${version}`, `https://npm.im/${name}`] as const;
		})
		.toSorted(([one], [two]) => one.localeCompare(two));

	await interaction.reply({
		embeds: [
			{
				title: "Credits",
				description: `Scradd is hosted on [Fly.io](https://fly.io/) using Node.JS ${process.version}.`,

				fields: [
					{ name: "🧑‍💻 Developers", value: await getRole(developers), inline: true },
					{ name: "🖌️ Designers", value: await getRole(designers), inline: true },
					{
						name: "🧪 Additional beta testers",
						value: await getRole(testers),
						inline: true,
					},
					...columns(
						dependencies,
						"🗄️ Third-party code libraries",
						2,
						([specifier, link]) =>
							"- " +
							(link ? `[${inlineCode(specifier)}](${link})` : inlineCode(specifier)),
					),
				],

				color: constants.themeColor,
			},
		],
	});

	async function getRole(roleId: Snowflake): Promise<string> {
		const role = await config.testingGuild?.roles.fetch(roleId);
		const members: { user: User }[] = [...(role?.members.values() ?? [])];
		if (roleId === designers)
			members.push({ user: await client.users.fetch(constants.users.weirdo) });

		return joinWithAnd(
			await Promise.all(
				members
					.toSorted((one, two) =>
						one.user.displayName.localeCompare(two.user.displayName),
					)
					.map(({ user }) =>
						mentionUser(user, interaction.user, interaction.guild ?? config.guild),
					),
			),
		);
	}
}
