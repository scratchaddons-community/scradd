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
	TimestampStyles,
} from "discord.js";
import client from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { getLoggingThread } from "../common/logging.js";
import { strikeDatabase } from "../common/warn.js";
import { convertBase } from "../util/numbers.js";
import { defineCommand } from "../common/types/command.js";
import { userSettingsDatabase } from "./settings.js";

// TODO: rewrite
// TODO: handle unwarning

const command = defineCommand({
	data: {
		description: "Commands to view strike information",
		subcommands: {
			user: {
				description: "View your or (Mods only) someone else’s strikes",
				options: {
					user: {
						type: ApplicationCommandOptionType.User,
						description: "(Mods only) The user to see strikes for",
					},
				},
			},
			id: {
				description: "View a strike by ID",
				options: {
					id: {
						required: true,
						type: ApplicationCommandOptionType.String,
						description: "The strike's ID",
					},
				},
			},
		},
		censored: false,
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
							interaction.member.roles.resolve(CONSTANTS.roles.mod.id))
						? { ...(await getStrikesForMember(user)), ephemeral: true }
						: {
								ephemeral: true,
								content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's strikes!`,
						  },
				);
			}
			case "id": {
				await interaction.reply(
					await getStrikeById(
						interaction.member,
						interaction.options.getString("id", true),
					),
				);
			}
		}
	},
});
export default command;

export async function getStrikesForMember(user: User | GuildMember): Promise<BaseMessageOptions> {
	const strikes = strikeDatabase.data
		.filter((strike) => strike.user === user.id)
		.sort((one, two) => two.expiresAt - one.expiresAt);

	const member =
		user instanceof GuildMember
			? user
			: await CONSTANTS.guild?.members.fetch(user.id).catch(() => {});

	return {
		components: strikes.length
			? [
					{
						type: ComponentType.ActionRow,
						components: strikes.map((strike) => ({
							label: strike.info || "",
							style: ButtonStyle.Secondary,
							custom_id: `${strike.info}_strike`,
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
				} has ${strikes.length} strike${strikes.length === 1 ? "" : "s"}`,
				author: {
					icon_url: (member || user).displayAvatarURL(),
					name: user instanceof GuildMember ? user.user.username : user.username,
				},
				color: member?.displayColor,
				description:
					strikes
						.map((strike) => {
							return `\`${strike.info}\`${
								strike.count === 1
									? ""
									: ` (${
											strike.count === 0.25 ? "verbal" : `\\*${strike.count}`
									  })`
							}: expiring ${time(
								new Date(strike.expiresAt),
								TimestampStyles.RelativeTime,
							)}`;
						})
						.join("\n") || `${user.toString()} has no strikes!`,
			},
		],
	};
}

export async function getStrikeById(
	interactor: GuildMember,
	filter: string,
): Promise<InteractionReplyOptions> {
	const useMentions =
		userSettingsDatabase.data.find((settings) => interactor.id === settings.user)
			?.useMentions ?? false;

	const isMod = CONSTANTS.roles.mod && interactor.roles.resolve(CONSTANTS.roles.mod.id);
	const id = convertBase(filter, convertBase.MAX_BASE, 10);
	console.log(id);
	const channel = await getLoggingThread("members");

	const idMessage =
		(await channel.messages.fetch(id).catch(() => {})) ||
		(await CONSTANTS.channels.modlogs?.messages.fetch(id).catch(() => {}));

	const message =
		idMessage ||
		(await channel.messages.fetch(filter).catch(() => {})) ||
		(await CONSTANTS.channels.modlogs?.messages.fetch(filter).catch(() => {}));

	if (!message) {
		return { ephemeral: true, content: `${CONSTANTS.emojis.statuses.no} Invalid filter!` };
	}

	/** A global regular expression variant of {@link MessageMentions.UsersPattern}. */
	const GlobalUsersPattern = new RegExp(MessageMentions.UsersPattern.source, "g");

	const userId = GlobalUsersPattern.exec(message.content)?.[1] || "";
	if (userId !== interactor.id && !isMod)
		return {
			ephemeral: true,
			content: `${CONSTANTS.emojis.statuses.no} You don't have permission to view this member's strikes!`,
		};

	const member = await CONSTANTS.guild?.members.fetch(userId).catch(() => {});
	const user = member?.user || (await client.users.fetch(userId).catch(() => {}));
	const nick = member?.displayName ?? user?.username;
	const caseId = idMessage ? filter : convertBase(filter, 10, convertBase.MAX_BASE);
	const { url } = message.attachments.first() || {};
	const mod =
		isMod &&
		(await client.users
			.fetch(GlobalUsersPattern.exec(message.content)?.[1] || "")
			.catch(() => {}));

	const { expiresAt } = strikeDatabase.data.find((strike) => strike.info === message.id) || {};

	return {
		ephemeral: true,
		embeds: [
			{
				color: member?.displayColor,
				author: nick
					? { icon_url: (member || user)?.displayAvatarURL(), name: nick }
					: undefined,
				title: `Strike \`${caseId}\``,
				description: url
					? await fetch(url).then((response) => response.text())
					: message.content,
				timestamp: message.createdAt.toISOString(),
				fields: [
					{
						name: "⚠ Count",
						value:
							"" +
							(strikeDatabase.data.find(({ info }) => info === caseId)?.count ??
								/ \d+ /.exec(message.content)?.[0]?.trim() ??
								"0"),
						inline: true,
					},
					...(mod
						? [
								{
									name: "🛡 Moderator",
									value: useMentions ? mod.toString() : mod.username,
									inline: true,
								},
						  ]
						: []),
					...(user
						? [
								{
									name: "👤 Target user",
									value: useMentions ? user.toString() : user.username,
									inline: true,
								},
						  ]
						: []),
					...(expiresAt
						? [
								{
									name: "⏲ Expirery",
									value: time(new Date(expiresAt), TimestampStyles.RelativeTime),
									inline: true,
								},
						  ]
						: []),
				],
			},
		],
	};
}
