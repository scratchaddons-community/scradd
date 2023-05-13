import {
	time,
	type Snowflake,
	type Role,
	TimestampStyles,
	ChannelType,
	ComponentType,
	ButtonStyle,
	GuildMember,
	User,
	userMention,
} from "discord.js";

import client from "../client.js";
import CONSTANTS, { syncConstants } from "../common/CONSTANTS.js";
import defineCommand from "../commands.js";
import pkg from "../package.json" assert { type: "json" };
import { autoreactions, dadEasterEggCount } from "../secrets.js";
import { escapeMessage } from "../util/markdown.js";
import { joinWithAnd } from "../util/text.js";
import { getSettings } from "./settings.js";
import { defineButton } from "../components.js";
import log, { LoggingEmojis } from "./modlogs/misc.js";

/**
 * Get all users with a role.
 *
 * @param roleId - Role to fetch.
 * @param useMentions - Whether to use mentions or usernames.
 *
 * @returns Users with the role.
 */
async function getRole(roleId: Snowflake, useMentions = false): Promise<string> {
	const role = await CONSTANTS.testingServer?.roles.fetch(roleId);
	const members: { user: User }[] = role?.members.toJSON() ?? [];
	if (roleId === CONSTANTS.roles.designers)
		members.push({ user: await client.users.fetch("765910070222913556") });

	return joinWithAnd(
		members.sort((one, two) => one.user.username.localeCompare(two.user.username)),
		(member) => (useMentions ? userMention(member.user.id) : member.user.username),
	);
}

defineCommand(
	{
		name: "info",
		description: "Learn about me",

		subcommands: {
			status: { description: "Show bot status" },
			credits: { description: "Show credit information" },
			config: { description: "Show configuration settings" },
		},
	},

	async (interaction) => {
		switch (interaction.options.getSubcommand(true)) {
			case "status": {
				const message = await interaction.reply({ content: "Pinging…", fetchReply: true });

				await interaction.editReply({
					content: "",

					embeds: [
						{
							title: "Status",
							description: `I’m open-source! The source code is available [on GitHub](https://github.com/scratchaddons-community/scradd).`,

							fields: [
								{
									name: "Mode",

									value:
										process.env.NODE_ENV === "production"
											? "Production"
											: "Testing",

									inline: true,
								},
								{ name: "Version", value: `v${pkg.version}`, inline: true },
								{
									name: "Last restarted",

									value: time(client.readyAt, TimestampStyles.RelativeTime),

									inline: true,
								},
								{
									name: "Ping",

									value: `${Math.abs(
										Number(message.createdAt) - Number(interaction.createdAt),
									).toLocaleString()}ms`,

									inline: true,
								},
								{
									name: "WebSocket latency",
									value: `${client.ws.ping.toLocaleString()}ms`,
									inline: true,
								},
								{ name: "Node version", value: process.version, inline: true },
							],

							thumbnail: { url: client.user.displayAvatarURL() },
							color: CONSTANTS.themeColor,
						},
					],
				});
				break;
			}
			case "config": {
				await interaction.reply({
					embeds: getConfig(),

					components:
						CONSTANTS.roles.admin &&
						(interaction.member instanceof GuildMember
							? interaction.member.roles.resolve(CONSTANTS.roles.admin.id)
							: interaction.member.roles.includes(CONSTANTS.roles.admin.id))
							? [
									{
										type: ComponentType.ActionRow,
										components: [
											{
												style: ButtonStyle.Primary,
												type: ComponentType.Button,
												label: "Sync",
												customId: "_syncConstants",
											},
										],
									},
							  ]
							: [],
				});
				break;
			}
			case "credits": {
				const useMentions = getSettings(interaction.user).useMentions;

				await interaction.reply({
					embeds: [
						{
							title: "Credits",
							description: "Scradd is hosted on [Railway](https://railway.app/).",

							fields: [
								{
									name: "Developers",
									value: await getRole(CONSTANTS.roles.developers, useMentions),
									inline: true,
								},
								{
									name: "Designers",
									value: await getRole(CONSTANTS.roles.designers, useMentions),
									inline: true,
								},
								{
									name: "Additional beta testers",
									value: await getRole(CONSTANTS.roles.testers, useMentions),
									inline: true,
								},
								{
									name: "Third-party code libraries",

									value: joinWithAnd(
										Object.entries(pkg.dependencies),
										([dependency, version]) =>
											`\`${escapeMessage(`${dependency}@${version}`)}\``,
									),

									inline: true,
								},
							],

							color: CONSTANTS.themeColor,
						},
					],
				});
			}
		}
	},
);

defineButton("syncConstants", async (interaction) => {
	if (
		CONSTANTS.roles.admin &&
		(interaction.member instanceof GuildMember
			? interaction.member.roles.resolve(CONSTANTS.roles.admin.id)
			: interaction.member?.roles.includes(CONSTANTS.roles.admin.id))
	) {
		await syncConstants();
		await interaction.message.edit({ embeds: getConfig() });
		await interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.yes} Synced configuration!`,
		});
		await log(`${LoggingEmojis.ServerUpdate} Configuration synced by ${interaction.member?.toString()}`)
	} else
		interaction.reply({
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don’t have permission to sync my configuration!`,
		});
});

function getConfig() {
	return [
		{
			title: "Configuration",
			description: `There are currently **${dadEasterEggCount}** custom dad responses and **${autoreactions.length}** autoreactions.\nSome have multiple triggers, which are not counted here.`,
			color: CONSTANTS.themeColor,
		},
		{
			description: "**CHANNELS**",

			fields: [
				...Object.entries(CONSTANTS.channels).map((channel) => ({
					name: `${channel[0]
						.split("_")
						.map((name) => (name[0] ?? "").toUpperCase() + name.slice(1))
						.join(" ")} ${
						channel[1]?.type === ChannelType.GuildCategory ? "category" : "channel"
					}`,

					value: channel[1]?.toString() ?? "*None*",
					inline: true,
				})),
			],

			color: CONSTANTS.themeColor,
		},
		{
			description: "**ROLES**",
			fields: [
				...Object.entries(CONSTANTS.roles)
					.filter(
						(role): role is [typeof role[0], Role | undefined] =>
							typeof role[1] !== "string",
					)
					.map((role) => ({
						name: `${role[0]
							.split("_")
							.map((name) => (name[0] ?? "").toUpperCase() + name.slice(1))
							.join(" ")} role`,

						value: role[1]?.toString() ?? "*None*",
						inline: true,
					})),
			],

			color: CONSTANTS.themeColor,
		},
	];
}
