import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	GuildMember,
	time,
	TimestampStyles,
} from "discord.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { defineChatCommand } from "strife.js";
import { REACTIONS_NAME, boardDatabase } from "./board/misc.js";
import { xpDatabase } from "./xp/misc.js";
import { strikeDatabase } from "./punishments/misc.js";

defineChatCommand(
	{
		name: "user-info",
		description: "View information about a user",

		options: {
			user: {
				type: ApplicationCommandOptionType.User,
				description: "The user to view (defaults to you)",
			},
		},
	},

	async (interaction, options) => {
		const user = await (
			(options.user instanceof GuildMember ? options.user.user : options.user) ??
			interaction.user
		).fetch();
		const member =
			options.user instanceof GuildMember
				? options.user
				: interaction.member instanceof GuildMember
				? interaction.member
				: undefined;
		const isMod =
			config.roles.mod &&
			(interaction.member instanceof GuildMember
				? interaction.member.roles.resolve(config.roles.mod.id)
				: interaction.member.roles.includes(config.roles.mod.id));

		const fields = [
			{ name: "🏷️ ID", value: user.id, inline: true },
			{
				name: "🆕 Created Account",
				value: time(user.createdAt, TimestampStyles.RelativeTime),
				inline: true,
			},
			user.globalName
				? { name: "🪪 Display Name", value: user.globalName, inline: true }
				: { name: constants.zeroWidthSpace, value: constants.zeroWidthSpace, inline: true },
		];

		if (member?.joinedAt)
			fields.push({
				name: "➡️ Joined Server",
				value: time(member.joinedAt, TimestampStyles.RelativeTime),
				inline: true,
			});
		if (member?.nickname)
			fields.push({ name: "👋 Nickname", value: member.nickname, inline: true });
		if (member?.voice.channel)
			fields.push({
				name: "🔊 Voice Channel",
				value:
					member.voice.channel.toString() +
					`${member.voice.mute ? constants.emojis.discord.muted + " " : ""}${
						member.voice.deaf ? constants.emojis.discord.deafened + " " : ""
					}${
						member.voice.streaming || member.voice.selfVideo
							? constants.emojis.discord.streaming
							: ""
					}`.trim(),
				inline: true,
			});

		if (member)
			fields.push({
				name: "🗄️ Roles",
				value:
					member.roles
						.valueOf()
						.sorted((one, two) => two.comparePositionTo(one))
						.filter((role) => role.id !== config.guild.id)
						.toJSON()
						.join(" ") || "*No roles*",
				inline: false,
			});

		const banned = await config.guild.bans.fetch(user.id).catch(() => void 0);
		if (banned)
			fields.push(
				isMod
					? {
							name: "🔨 Ban Reason",
							value: banned.reason ?? "No reason provided",
							inline: true,
					  }
					: { name: "🔨 Banned", value: "Yes", inline: true },
			);

		const xp = xpDatabase.data.find((entry) => entry.user === user.id)?.xp ?? 0;
		const hasPotatoes = boardDatabase.data.some((message) => message.user === user.id);
		const hasStrikes = strikeDatabase.data.some((strike) => strike.user === user.id);

		const buttons = [
			xp && { customId: `${user.id}_xp`, label: "XP" },
			hasPotatoes && {
				customId: `${user.id}_exploreBoard`,
				label: `Explore ${REACTIONS_NAME}`,
			},
			member &&
				isMod &&
				config.channels.tickets?.permissionsFor(member)?.has("ViewChannel") && {
					customId: `${user.id}_contactUser`,
					label: "Contact User",
				},
			hasStrikes &&
				(user.id == interaction.user.id || isMod) && {
					customId: `${user.id}_viewStrikes`,
					label: "Strikes",
				},
		]
			.filter((button): button is { customId: string; label: string } => !!button)
			.map(
				(button) =>
					({
						...button,
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
					} as const),
			);

		await interaction.reply({
			embeds: [
				{
					color: member?.displayColor,
					image: {
						url:
							user.bannerURL({ size: 1024 }) ??
							`https://singlecolorimage.com/get/${user.accentColor?.toString(
								16,
							)}/600x105`,
					},
					thumbnail: { url: (member ?? user).displayAvatarURL() },
					fields,
					author: {
						name: user.tag + (user.bot ? " 🤖" : ""),
						url:
							member &&
							`https://discordlookup.com/permissions-calculator/${
								(interaction.channel
									? member.permissionsIn(interaction.channel)
									: member.permissions
								).bitfield
							}`,
						icon_url: member?.avatar ? user.displayAvatarURL() : undefined,
					},
				},
			],
			components: buttons.length
				? [{ type: ComponentType.ActionRow, components: buttons }]
				: undefined,
		});
	},
);
