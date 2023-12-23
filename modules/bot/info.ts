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
} from "discord.js";
import { client } from "strife.js";
import config, { syncConfig } from "../../common/config.js";
import pkg from "../../package.json" assert { type: "json" };
import { autoreactions, dadEasterEggCount } from "../auto/secrets.js";
import { escapeMessage } from "../../util/markdown.js";
import { joinWithAnd } from "../../util/text.js";
import { mentionUser } from "../settings.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";
import constants from "../../common/constants.js";

const testingServer = await client.guilds.fetch(constants.testingGuildId).catch(() => void 0);
const designers = "966174686142672917",
	developers = "938439909742616616",
	testers = "938440159102386276";

export default async function info(
	interaction: ChatInputCommandInteraction,
	{ subcommand }: { subcommand: "config" | "credits" | "status" },
) {
	switch (subcommand) {
		case "status": {
			const message = await interaction.reply({ content: "Pinging…", fetchReply: true });

			await interaction.editReply({
				content: "",

				embeds: [
					{
						title: "Status",
						description:
							"I’m open-source! The source code is available [on GitHub](https://github.com/scratchaddons-community/scradd).",

						fields: [
							{
								name: "⚙️ Mode",

								value:
									process.env.NODE_ENV === "production"
										? "Production"
										: "Development",

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
									Number(message.createdAt) - Number(interaction.createdAt),
								).toLocaleString("en-us")}ms`,

								inline: true,
							},
							{
								name: "↕️ WebSocket latency",
								value: `${Math.abs(client.ws.ping).toLocaleString("en-us")}ms`,
								inline: true,
							},
							{
								name: "💾 RAM usage",
								value:
									(process.memoryUsage.rss() / 1_000_000).toLocaleString(
										"en-us",
										{ maximumFractionDigits: 2, minimumFractionDigits: 2 },
									) + " MB",
								inline: true,
							},
						],

						thumbnail: { url: client.user.displayAvatarURL() },
						color: constants.themeColor,
					},
				],
			});
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
		case "credits": {
			await interaction.reply({
				embeds: [
					{
						title: "Credits",
						description: `Scradd is hosted on [Railway](https://railway.app?referralCode=RedGuy14) using Node.JS ${process.version}.`,

						fields: [
							{
								name: "🧑‍💻 Developers",
								value: await getRole(developers),
								inline: true,
							},
							{ name: "🖌️ Designers", value: await getRole(designers), inline: true },
							{
								name: "🧪 Additional beta testers",
								value: await getRole(testers),
								inline: true,
							},
							{
								name: "🗄️ Third-party code libraries",

								value: joinWithAnd(
									Object.entries(pkg.dependencies),
									([dependency, version]) =>
										`\`${escapeMessage(`${dependency}@${version}`)}\``,
								),

								inline: true,
							},
						],

						color: constants.themeColor,
					},
				],
			});
		}
	}

	async function getRole(roleId: Snowflake): Promise<string> {
		const role = await testingServer?.roles.fetch(roleId);
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
