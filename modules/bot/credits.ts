import {
	inlineCode,
	type ChatInputCommandInteraction,
	type Snowflake,
	type User,
} from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import lockFile from "../../package-lock.json" assert { type: "json" };
import pkg from "../../package.json" assert { type: "json" };
import { columnize } from "../../util/discord.js";
import { joinWithAnd } from "../../util/text.js";
import { mentionUser } from "../settings.js";

const designers = "966174686142672917",
	developers = "938439909742616616",
	testers = "938440159102386276";

export default async function credits(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply();
	const dependencies = Object.keys(pkg.dependencies)
		.map((name) => {
			const { version } = lockFile.dependencies[name];

			if (version.startsWith("file:")) return [inlineCode(name)] as const;

			if (/^https?:\/\//.test(version)) return [inlineCode(name), version] as const;

			if (version.startsWith("git+")) {
				const git = version.split("+")[1]?.split("#");
				return git ?
						([git[1] ? (`${name}@${git[1]}` as const) : name, git[0]] as const)
					:	([inlineCode(name)] as const);
			}
			if (version.startsWith("npm:")) {
				const npm = version.split("@");
				const reference = `${npm.length > 2 ? "@" : ""}${npm.at(-2) ?? npm[0]}`;
				const resolvedVersion = npm.at(-1) ?? npm[0];
				return [
					`${inlineCode(reference)}@${resolvedVersion}`,
					`${constants.domains.npm}/${reference}/v/${resolvedVersion}`,
				] as const;
			}

			return [
				`${inlineCode(name)}@${version}`,
				`${constants.domains.npm}/${name}/v/${version}`,
			] as const;
		})
		.toSorted(([one], [two]) => one.localeCompare(two));

	await interaction.editReply({
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
						dependencies,
						([specifier, link]) =>
							"- " + (link ? `[${specifier}](${link})` : specifier),
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
