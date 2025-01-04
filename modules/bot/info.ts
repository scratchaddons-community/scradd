import type { APIEmbedField, ChatInputCommandInteraction, User } from "discord.js";



import { inlineCode, Team, time, TimestampStyles } from "discord.js";
import { client, columnize } from "strife.js";



import constants from "../../common/constants.ts";
import pkg from "../../package.json" with { type: "json" };


const dependencyColumns = await getDependencies();

export default async function info(interaction: ChatInputCommandInteraction): Promise<void> {
	const message = await interaction.deferReply({ fetchReply: true });
	const owner = getOwner();
	await interaction.editReply({
		content: "",

		embeds: [
			{
				title: "Status",
				thumbnail: { url: client.user.displayAvatarURL() },
				color: constants.themeColor,
				description: `I’m open-source! The source code is available [on GitHub](https://github.com/${
					constants.repos.scradd
				}).`,

				fields: [
					{
						name: "⚙️ Mode",
						value: inlineCode(constants.env),
						inline: true,
					},
					{ name: "🔢 Version", value: `v${pkg.version}`, inline: true },
					{
						name: "🔁 Last restarted",
						value: time(client.readyAt, TimestampStyles.RelativeTime),
						inline: true,
					},
					{
						name: "🏓 Ping",
						value: `${Math.abs(
							message.createdTimestamp - interaction.createdTimestamp,
						).toLocaleString()}ms`,
						inline: true,
					},
					{
						name: "↕️ WebSocket latency",
						value: `${Math.abs(client.ws.ping).toLocaleString()}ms`,
						inline: true,
					},
					{
						name: "💾 RAM usage",
						value: `${(process.memoryUsage.rss() / 1_000_000).toLocaleString([], {
							maximumFractionDigits: 2,
							minimumFractionDigits: 2,
						})} MB`,
						inline: true,
					},
				],
			},
			{
				title: "Credits",
				description: `${client.user.displayName} is ${
					owner ? `maintained by ${owner.toString()} and ` : ""
				}hosted on [Railway](https://railway.app?referralCode=RedGuy14) using Node.JS ${process.version}.\n`,
				fields: dependencyColumns,
				color: constants.themeColor,
			},
		],
	});
}

function getOwner(): User | undefined {
	const { owner } = client.application;
	if (!(owner instanceof Team)) return owner ?? undefined;

	return (owner.owner ?? owner.members.first())?.user;
}

async function getDependencies(): Promise<APIEmbedField[]> {
	const dependencyNames = Object.keys(pkg.dependencies);
	const promises = dependencyNames.map((name) =>
		import(`../../../node_modules/${name}/package.json`, { with: { type: "json" } }).then(
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
