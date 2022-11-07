import {
	GuildMember,
	MessageMentions,
	time,
	ButtonStyle,
	BaseMessageOptions,
	InteractionReplyOptions,
	User,
	ComponentType,
	ApplicationCommandOptionType,
} from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { getLoggingThread } from "../common/logging.js";
import { removeExpiredWarns, muteLog, warnLog, WARN_INFO_BASE } from "../common/warns.js";
import { convertBase } from "../util/numbers.js";
import type { ChatInputCommand } from "../common/types/command";

const command: ChatInputCommand = {
	data: {
		description: "Commands to view strike information",
		options: [
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "user",
				description: "View your or (Mods only) someone else’s active strikes",
				options: [
					{
						type: ApplicationCommandOptionType.User,
						name: "user",
						description: "(Mods only) The user to see strikes for",
					},
				],
			},
			{
				type: ApplicationCommandOptionType.Subcommand,
				name: "id",
				description: "View a strike by ID",
				options: [
					{
						required: true,
						type: ApplicationCommandOptionType.String,
						name: "id",
						description: "The strike's ID",
					},
				],
			},
		],
	},

	async interaction(interaction) {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("interaction.member is not a GuildMember");
		switch (interaction.options.getSubcommand(true)) {
			case "user": {
				const user = interaction.options.getUser("user") ?? interaction.member;

				return await interaction.reply(
					user.id === interaction.member.id ||
						(CONSTANTS.roles.mod &&
							interaction.member.roles.resolve(CONSTANTS.roles.mod))
						? { ...(await getWarnsForMember(user)), ephemeral: true }
						: {
								ephemeral: true,
								content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's warns!`,
						  },
				);
			}
			case "id": {
				await interaction.reply(
					await getWarnById(
						interaction.member,
						interaction.options.getString("id", true),
					),
				);
			}
		}
	},
	censored: false,
};
export default command;

export async function getWarnsForMember(user: User | GuildMember): Promise<BaseMessageOptions> {
	const warns = (await removeExpiredWarns(warnLog)).filter((warn) => warn.user === user.id);
	const mutes = (await removeExpiredWarns(muteLog)).filter((mute) => mute.user === user.id);

	const member =
		user instanceof GuildMember
			? user
			: await CONSTANTS.guild?.members.fetch(user.id).catch(() => {});

	const strikes = await Promise.all(
		warns
			.filter((warn, index) => warns.findIndex((w) => w.info == warn.info) == index)
			.sort((one, two) => two.expiresAt - one.expiresAt),
	);

	return {
		components: strikes.length
			? [
					{
						type: ComponentType.ActionRow,
						components: strikes.map((warn) => ({
							label: convertBase(warn.info || "", 10, WARN_INFO_BASE),
							style: ButtonStyle.Secondary,
							custom_id: `${warn.info}_strike`,
							type: ComponentType.Button,
						})),
					},
			  ]
			: [],
		embeds: [
			{
				title: `${
					member?.displayName ||
					(user instanceof GuildMember ? user.user.username : user.username)
				} has ${warns.length} active strike${warns.length === 1 ? "" : "s"}`,
				author: {
					icon_url: (member || user).displayAvatarURL(),
					name: user instanceof GuildMember ? user.user.username : user.username,
				},
				color: member?.displayColor,
				description:
					(
						await Promise.all(
							strikes.map(async (warn) => {
								const strikes = warns.filter(
									({ info }) => info === warn.info,
								).length;

								return `\`${convertBase(warn.info || "", 10, WARN_INFO_BASE)}\`${
									strikes === 1 ? "" : ` (*${strikes})`
								}: expiring ${time(new Date(warn.expiresAt), "R")}`;
							}),
						)
					).join("\n") || `${user.toString()} has no recent strikes!`,
				footer: mutes.length
					? {
							text:
								`${
									user instanceof GuildMember ? user.user.username : user.username
								} has been muted ` +
								mutes.length +
								` time${mutes.length === 1 ? "" : "s"} recently.`,
					  }
					: undefined,
			},
		],
	};
}

export async function getWarnById(
	interactor: GuildMember,
	filter: string,
): Promise<InteractionReplyOptions> {
	const isMod = CONSTANTS.roles.mod && interactor.roles.resolve(CONSTANTS.roles.mod.id);
	const id = convertBase(filter, WARN_INFO_BASE, 10);
	const channel = await getLoggingThread("members");

	const idMessage =
		(await channel?.messages.fetch(id).catch(() => {})) ||
		(await CONSTANTS.channels.modlogs?.messages.fetch(id).catch(() => {}));

	const message =
		idMessage ||
		(await channel?.messages.fetch(filter).catch(() => {})) ||
		(await CONSTANTS.channels.modlogs?.messages.fetch(id).catch(() => {}));

	if (!message) {
		return { ephemeral: true, content: `${CONSTANTS.emojis.statuses.no} Invalid filter!` };
	}

	/** A global regular expression variant of {@link MessageMentions.UsersPattern}. */
	const GlobalUsersPattern = new RegExp(MessageMentions.UsersPattern.source, "g");

	const userId = GlobalUsersPattern.exec(message.content)?.[1] || "";
	if (userId !== interactor.id && !isMod)
		return {
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's warns!`,
		};

	const member = await CONSTANTS.guild?.members.fetch(userId).catch(() => {});
	const user = member?.user || (await client.users.fetch(userId).catch(() => {}));
	const nick = member?.displayName ?? user?.username;
	const caseId = idMessage ? filter : convertBase(filter, 10, WARN_INFO_BASE);
	const { url } = message.attachments.first() || {};
	const mod =
		isMod &&
		(await client.users
			.fetch(GlobalUsersPattern.exec(message.content)?.[1] || "")
			.catch(() => {}));

	const allWarns = await removeExpiredWarns(warnLog);
	const { expiresAt } = allWarns.find((warn) => warn.info === message.id) || {};

	return {
		ephemeral: true,
		embeds: [
			{
				color: member?.displayColor,
				author: nick
					? { icon_url: (member || user)?.displayAvatarURL(), name: nick }
					: undefined,
				title: `Case \`${caseId}\``,
				description: url
					? await fetch(url).then((response) => response.text())
					: message.content,
				timestamp: message.createdAt.toISOString(),
				fields: [
					{
						name: "⚠ Strikes",
						value: / \d+ /.exec(message.content)?.[0]?.trim() ?? "0",
						inline: true,
					},
					...(mod ? [{ name: "🛡 Moderator", value: mod.toString(), inline: true }] : []),
					...(user
						? [{ name: "👤 Target user", value: user.toString(), inline: true }]
						: []),
					...(expiresAt
						? [
								{
									name: "⏲ Expirery",
									value: time(new Date(expiresAt), "R"),
									inline: true,
								},
						  ]
						: []),
				],
			},
		],
	};
}
