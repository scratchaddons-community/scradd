import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonStyle,
	ComponentType,
	GuildMember,
	TimestampStyles,
	time,
	type RepliableInteraction,
	type User,
} from "discord.js";
import { client, defineButton, defineChatCommand, defineMenuCommand } from "strife.js";
import config from "../common/config.js";
import constants from "../common/constants.js";
import { REACTIONS_NAME, boardDatabase } from "./board/misc.js";
import { strikeDatabase } from "./punishments/util.js";
import { oldSuggestions, suggestionsDatabase } from "./suggestions/misc.js";
import { xpDatabase } from "./xp/util.js";

async function userInfo(
	interaction: RepliableInteraction,
	{ member, user }: { member?: GuildMember; user: User },
): Promise<void> {
	const isMod =
		interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.mod.id)
		:	interaction.member?.roles.includes(config.roles.mod.id);

	const fields = [
		{ name: "🏷️ ID", value: user.id, inline: true },
		{
			name: "🆕 Created Account",
			value: time(user.createdAt, TimestampStyles.RelativeTime),
			inline: true,
		},
		user.globalName ?
			{ name: "🪪 Display Name", value: user.globalName, inline: true }
		:	{ name: constants.zws, value: constants.zws, inline: true },
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
				`${member.voice.mute ? constants.emojis.vc.muted + " " : ""}${
					member.voice.deaf ? constants.emojis.vc.deafened + " " : ""
				}${member.voice.streaming ? constants.emojis.vc.streaming + " " : ""}${
					member.voice.selfVideo ? constants.emojis.vc.camera : ""
				}`.trim(),
			inline: true,
		});

	if (member)
		fields.push({
			name: "🗄️ Roles",
			value:
				[
					...member.roles
						.valueOf()
						.sorted((one, two) => two.comparePositionTo(one))
						.filter(({ id }) => id !== interaction.guild?.id)
						.values(),
				].join(" ") || "*No roles*",
			inline: false,
		});

	const banned =
		interaction.guild?.id === config.guild.id &&
		(await config.guild.bans.fetch(user.id).catch(() => void 0));
	if (banned)
		fields.push(
			isMod ?
				{
					name: "🔨 Ban Reason",
					value: banned.reason ?? constants.defaultPunishment,
					inline: true,
				}
			:	{ name: "🔨 Banned", value: "Yes", inline: true },
		);

	const hasSuggestions = [...oldSuggestions, ...suggestionsDatabase.data].some(
		({ author }) => author.valueOf() === user.id,
	);
	const hasBoards = boardDatabase.data.some((message) => message.user === user.id);
	const showBottom = !interaction.isButton();
	const xp =
		showBottom &&
		interaction.guild?.id === config.guild.id &&
		xpDatabase.data.find((entry) => entry.user === user.id)?.xp;
	const hasStrikes =
		showBottom &&
		(user.id == interaction.user.id || isMod) &&
		strikeDatabase.data.some((strike) => strike.user === user.id);
	const canContact =
		!interaction.isButton() &&
		member &&
		isMod &&
		config.channels.tickets?.permissionsFor(member)?.has("ViewChannel");

	const buttonData = [
		[
			hasSuggestions && { customId: `${user.id}_suggestions`, label: "List Suggestions" },
			hasBoards && {
				customId: `${user.id}_exploreBoard`,
				label: `Explore ${REACTIONS_NAME}`,
			},
		],
		[
			xp && { customId: `${user.id}_xp`, label: "XP" },
			hasStrikes && { customId: `${user.id}_viewStrikes`, label: "Strikes" },
			canContact && { customId: `${user.id}_contactUser`, label: "Contact User" },
		],
	];
	const rows = buttonData
		.map((row) =>
			row.filter(Boolean).map(
				(button) =>
					({
						...button,
						style: ButtonStyle.Secondary,
						type: ComponentType.Button,
					}) as const,
			),
		)
		.filter(({ length }) => length);

	const banner =
		user.bannerURL({ size: 1024 }) ??
		(typeof user.accentColor === "number" &&
			`https://singlecolorimage.com/get/${user.accentColor.toString(16)}/680x240`);
	await interaction.reply({
		ephemeral:
			interaction.isButton() &&
			interaction.message.interaction?.user.id !== interaction.user.id,
		embeds: [
			{
				description: user.toString(),
				color: member?.displayColor,
				image: banner ? { url: banner } : undefined,
				thumbnail: { url: (member ?? user).displayAvatarURL() },
				fields,
				author: {
					name: user.tag + (user.bot ? " 🤖" : ""),
					url:
						member &&
						`${constants.urls.permissions}/${
							(interaction.channel && interaction.inGuild() ?
								member.permissionsIn(interaction.channel)
							:	member.permissions
							).bitfield
						}`,
					icon_url: member?.avatar ? user.displayAvatarURL() : undefined,
				},
			},
		],
		components:
			rows.length ?
				rows.map((components) => ({ type: ComponentType.ActionRow, components }) as const)
			:	undefined,
	});
}

defineChatCommand(
	{
		name: "user-info",
		description: "View information about a user",
		access: true,

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
			options.user ?
				options.user instanceof GuildMember && options.user
			:	interaction.member instanceof GuildMember && interaction.member;
		await userInfo(interaction, { user, member: member || undefined });
	},
);
defineMenuCommand(
	{ name: "User Info", type: ApplicationCommandType.User, access: true },
	async (interaction) => {
		const user = await interaction.targetUser.fetch();
		const member =
			interaction.targetMember instanceof GuildMember ? interaction.targetMember : undefined;
		await userInfo(interaction, { user, member });
	},
);
defineButton("userInfo", async (interaction, id) => {
	const member = await interaction.guild?.members.fetch(id).catch(() => void 0);
	const user = member?.user ?? (await client.users.fetch(id));
	await userInfo(interaction, { user, member });
});
