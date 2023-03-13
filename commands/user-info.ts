import {
	ApplicationCommandOptionType,
	ButtonStyle,
	ComponentType,
	GuildMember,
	time,
	TimestampStyles,
} from "discord.js";

import CONSTANTS from "../common/CONSTANTS.js";
import { defineCommand } from "../common/types/command.js";

const command = defineCommand({
	data: {
		description: "View information about a user",

		options: {
			user: {
				type: ApplicationCommandOptionType.User,
				description: "The user to view (defaults to you)",
			},
		},
	},

	async interaction(interaction) {
		const user = await (interaction.options.getUser("user") ?? interaction.user).fetch();
		const rawMember =
			interaction.options.getMember("user") ??
			(user.id === interaction.user.id ? interaction.member : undefined);
		const member = rawMember instanceof GuildMember ? rawMember : undefined;
		const isMod =
			CONSTANTS.roles.mod &&
			(interaction.member instanceof GuildMember
				? interaction.member.roles.resolve(CONSTANTS.roles.mod.id)
				: interaction.member.roles.includes(CONSTANTS.roles.mod.id));

		const emptyColumn = {
			name: CONSTANTS.zeroWidthSpace,
			value: CONSTANTS.zeroWidthSpace,
			inline: true,
		};

		const fields = [{ name: "ID", value: user.id, inline: true }];
		if (member?.nickname)
			fields.push({ name: "Nickname", value: member.nickname, inline: true });
		fields.push(
			member?.voice.channel
				? {
						name: "Voice Channel",
						value:
							member.voice.channel?.toString() +
							`${member.voice.mute ? CONSTANTS.emojis.discord.muted + " " : ""}${
								member.voice.deaf ? CONSTANTS.emojis.discord.deafened + " " : ""
							}${
								member.voice.streaming ? CONSTANTS.emojis.discord.streaming : ""
							}`.trim(),
						inline: true,
				  }
				: emptyColumn,
		);
		if (!member?.nickname) fields.push(emptyColumn);

		if (member)
			fields.push({
				name: "Roles",
				value: member?.roles.valueOf().toJSON().join(" "),
				inline: false,
			});

		fields.push({
			name: "Created Account",
			value: time(user.createdAt, TimestampStyles.RelativeTime),
			inline: true,
		});

		const banned = await CONSTANTS.guild.bans.fetch(user.id).catch(() => {});
		if (banned)
			fields.push(
				isMod
					? {
							name: "Ban Reason",
							value: banned.reason ?? "No reason provided",
							inline: true,
					  }
					: { name: "Banned", value: "Yes", inline: true },
			);
		fields.push(
			member?.joinedAt
				? {
						name: "Joined Server",
						value: time(member.joinedAt, TimestampStyles.RelativeTime),
						inline: true,
				  }
				: emptyColumn,
			member?.premiumSince
				? {
						name: "Boosted Server",
						value: time(member.premiumSince, TimestampStyles.RelativeTime),
						inline: true,
				  }
				: emptyColumn,
		);

		await interaction.reply({
			embeds: [
				{
					color: member?.displayColor,
					// image: user.bannerURL() ?? user.accentColor,
					thumbnail: { url: (member ?? user).displayAvatarURL() },
					fields,
					author: {
						name: user.tag + (user.bot ? " 🤖" : ""),
						url: member
							? `https://discordlookup.com/permissions-calculator/${
									(interaction.channel
										? member.permissionsIn(interaction.channel)
										: member.permissions
									).bitfield
							  }`
							: undefined,
						icon_url: member?.avatar ? user.displayAvatarURL() : undefined,
					},
				},
			],
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						...(isMod
							? [
									{
										customId: `${user.id}_contactUser`,
										style: ButtonStyle.Secondary,
										type: ComponentType.Button,
										label: "Open Ticket",
									} as const,
							  ]
							: []),
						...(user.id == interaction.user.id || isMod
							? [
									{
										customId: `${user.id}_viewStrikes`,
										style: ButtonStyle.Secondary,
										type: ComponentType.Button,
										label: "List Strikes",
									} as const,
							  ]
							: []),
						{
							customId: `${user.id}_explorePotatoes`,
							style: ButtonStyle.Secondary,
							type: ComponentType.Button,
							label: "Explore Potatoes",
						},
						{
							customId: `${user.id}_xp`,
							style: ButtonStyle.Secondary,
							type: ComponentType.Button,
							label: "View XP",
						},
					],
				},
			],
		});
	},
});
export default command;
