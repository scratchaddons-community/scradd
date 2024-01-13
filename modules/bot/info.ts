import {
	time,
	type Snowflake,
	TimestampStyles,
	ChannelType,
	ComponentType,
	ButtonStyle,
	GuildMember,
	type User,
	type ChatInputCommandInteraction,
	type ButtonInteraction,
	inlineCode,
} from "discord.js";
import { client } from "strife.js";
import config, { syncConfig } from "../../common/config.js";
import pkg from "../../package.json" assert { type: "json" };
import lockFile from "../../package-lock.json" assert { type: "json" };
import { autoreactions, dadEasterEggCount } from "../auto/secrets.js";
import { joinWithAnd } from "../../util/text.js";
import { mentionUser } from "../settings.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";
import constants from "../../common/constants.js";

const designers = "1021061241260740719",
	developers = "1021061241260740720",
	testers = "1021061241260740718";

export default async function info(
	interaction: ChatInputCommandInteraction,
	{ subcommand }: { subcommand: "config" | "credits" | "status" },
) {
	switch (subcommand) {
		case "status": {
			await status(interaction);
			break;
		}
		case "credits": {
			await credits(interaction);
			break;
		}
		case "config": {
			const isStaff =
				config.roles.staff &&
				(interaction.member instanceof GuildMember
					? interaction.member.roles.resolve(config.roles.staff.id)
					: interaction.member?.roles.includes(config.roles.staff.id));
			await interaction.reply({
				embeds: getConfig(),

				components: isStaff
					? [
							{
								type: ComponentType.ActionRow,
								components: [
									{
										style: ButtonStyle.Primary,
										type: ComponentType.Button,
										label: "Sync",
										customId: "_syncConfig",
									},
								],
							},
					  ]
					: [],
			});
			break;
		}
	}
}

async function status(interaction: ChatInputCommandInteraction) {
	const message = await interaction.reply({ content: "Pinging…", fetchReply: true });

	await interaction.editReply({
		content: "",

		embeds: [
			{
				title: "Status",
				thumbnail: { url: client.user.displayAvatarURL() },
				color: constants.themeColor,
				description:
					"I’m open-source! The source code is available [on GitHub](https://github.com/scratchaddons-community/scradd).",

				fields: [
					{
						name: "⚙️ Mode",
						value: process.env.NODE_ENV === "production" ? "Production" : "Development",
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
						value:
							(process.memoryUsage.rss() / 1_000_000).toLocaleString([], {
								maximumFractionDigits: 2,
								minimumFractionDigits: 2,
							}) + " MB",
						inline: true,
					},
				],
			},
		],
	});
}
async function credits(interaction: ChatInputCommandInteraction) {
	const dependencies = Object.keys(pkg.dependencies)
		.map((name) => {
			const { version } = lockFile.dependencies[name];

			if (version.startsWith("file:")) return [name] as const;

			if (/^https?:\/\//.test(version)) return [name, version] as const;

			if (version.startsWith("git+")) {
				const segments = version.split("+")[1]?.split("#");
				return segments
					? ([`${name}@${segments[1]}`, segments[0]] as const)
					: ([name] as const);
			}
			if (version.startsWith("npm:")) {
				const segments = version.split("@");
				const reference = `${segments.length > 2 ? "@" : ""}${segments.at(-2)}`;
				return [`${reference}@${segments.at(-1)}`, `https://npm.im/${reference}`] as const;
			}

			return [`${name}@${version}`, `https://npm.im/${name}`] as const;
		})
		.sort(([one], [two]) => one.localeCompare(two))
		.map(
			([specifier, link]) =>
				"- " + (link ? `[${inlineCode(specifier)}](${link})` : inlineCode(specifier)),
		);

	const columnLength = Math.ceil(dependencies.length / 2);
	await interaction.reply({
		embeds: [
			{
				title: "Credits",
				description: `Scrub is hosted on [Fly.io](https://fly.io/) using Node.JS ${process.version}.\nBot code "borrowd" from @cobaltt7 and is available [on GitHub](https://github.com/scratchaddons-community/scradd)`,

				fields: [
					{ name: "🧑‍💻 Developers", value: await getRole(developers), inline: true },
					{ name: "🖌️ Designers", value: await getRole(designers), inline: true },
					{
						name: "🧪 Additional beta testers",
						value: await getRole(testers),
						inline: true,
					},
					{
						name: "🗄️ Third-party code libraries",
						value: dependencies.slice(0, columnLength).join("\n"),
						inline: true,
					},
					{
						name: constants.zws,
						value: dependencies.slice(columnLength).join("\n"),
						inline: true,
					},
				],

				color: constants.themeColor,
			},
		],
	});

	async function getRole(roleId: Snowflake): Promise<string> {
		const role = await config.testingGuild?.roles.fetch(roleId);
		const members: { user: User }[] = [...(role?.members.values() ?? [])];
		if (roleId === designers)
			members.push({ user: await client.users.fetch(constants.users.retron) });

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
function getConfig() {
	return [
		{
			color: constants.themeColor,
			description: `## Configuration\n\nThere are currently **${dadEasterEggCount}** custom dad responses and **${autoreactions.length}** autoreactions.\nSome have multiple triggers, which are not counted here.`,
		},
		{
			title: "Channels",
			color: constants.themeColor,

			fields: Object.entries(config.channels)
				.filter(
					(channel): channel is [typeof channel[0], Exclude<typeof channel[1], string>] =>
						typeof channel[1] !== "string",
				)
				.map((channel) => ({
					name: `${channel[0]
						.split("_")
						.map((name) => (name[0] ?? "").toUpperCase() + name.slice(1))
						.join(" ")} ${
						channel[1]?.type === ChannelType.GuildCategory ? "category" : "channel"
					}`,

					value: channel[1]?.toString() ?? "*None*",
					inline: true,
				})),
		},
		{
			title: "Roles",
			color: constants.themeColor,

			fields: Object.entries(config.roles).map((role) => ({
				name: `${role[1]?.unicodeEmoji ? role[1].unicodeEmoji + " " : ""}${role[0]
					.split("_")
					.map((name) => (name[0] ?? "").toUpperCase() + name.slice(1))
					.join(" ")} role`,

				value: role[1]?.toString() ?? "*None*",
				inline: true,
			})),
		},
	];
}

export async function syncConfigButton(interaction: ButtonInteraction) {
	if (
		config.roles.staff &&
		(interaction.member instanceof GuildMember
			? interaction.member.roles.resolve(config.roles.staff.id)
			: interaction.member?.roles.includes(config.roles.staff.id))
	) {
		await syncConfig();
		await interaction.message.edit({ embeds: getConfig() });
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.yes} Synced configuration!`,
		});
		await log(
			`${
				LoggingEmojis.ServerUpdate
			} Configuration synced by ${interaction.member?.toString()}`,
			LogSeverity.ImportantUpdate,
		);
	} else
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to sync my configuration!`,
		});
}
