import {
	EmbedBuilder,
	SlashCommandBuilder,
	GuildMember,
	ButtonBuilder,
	MessageMentions,
	time,
	ButtonStyle,
	BaseMessageOptions,
	InteractionReplyOptions,
	User,
	ActionRowBuilder,
} from "discord.js";
import fetch from "node-fetch";
import client, { guild } from "../client.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { getLoggingThread } from "../common/moderation/logging.js";
import {
	removeExpiredWarns,
	muteLog,
	warnLog,
	WARN_INFO_BASE,
} from "../common/moderation/warns.js";
import { convertBase } from "../util/numbers.js";
import type { ChatInputCommand } from "../common/types/command";

const command: ChatInputCommand = {
	data: new SlashCommandBuilder()
		.setDescription("Commands to view strike information")
		.addSubcommand((input) =>
			input
				.setName("user")
				.setDescription("View your or (Mods only) someone else’s active strikes")
				.addUserOption((input) =>
					input.setName("user").setDescription("(Mods only) The user to see strikes for"),
				),
		)
		.addSubcommand((input) =>
			input
				.setName("id")
				.setDescription("View a strike by ID")
				.addStringOption((input) =>
					input.setName("id").setDescription("The strike's ID").setRequired(true),
				),
		),

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
		user instanceof GuildMember ? user : await guild?.members.fetch(user.id).catch(() => {});

	const strikes = await Promise.all(
		warns
			.filter((warn, index) => warns.findIndex((w) => w.info == warn.info) == index)
			.sort((one, two) => two.expiresAt - one.expiresAt),
	);
	const embed = new EmbedBuilder()
		.setTitle(
			`${
				member?.displayName ||
				(user instanceof GuildMember ? user.user.username : user.username)
			} has ${warns.length} active strike${warns.length === 1 ? "" : "s"}`,
		)
		.setAuthor({
			iconURL: (member || user).displayAvatarURL(),
			name: user instanceof GuildMember ? user.user.username : user.username,
		})
		.setColor(member?.displayColor || null)
		.setDescription(
			(
				await Promise.all(
					strikes.map(async (warn) => {
						const strikes = warns.filter(({ info }) => info === warn.info).length;

						return `\`${convertBase(warn.info || "", 10, WARN_INFO_BASE)}\`${
							strikes === 1 ? "" : ` (*${strikes})`
						}: expiring ${time(new Date(warn.expiresAt), "R")}`;
					}),
				)
			).join("\n") || `${user.toString()} has no recent strikes!`,
		);
	if (mutes.length)
		embed.setFooter({
			text:
				`${
					user instanceof GuildMember ? user.user.username : user.username
				} has been muted ` +
				mutes.length +
				` time${mutes.length === 1 ? "" : "s"} recently.`,
		});
	return {
		components: strikes.length
			? [
					new ActionRowBuilder<ButtonBuilder>().addComponents(
						strikes.map((warn) =>
							new ButtonBuilder()
								.setLabel(convertBase(warn.info || "", 10, WARN_INFO_BASE))
								.setStyle(ButtonStyle.Secondary)
								.setCustomId(`${warn.info}_strike`),
						),
					),
			  ]
			: [],
		embeds: [embed],
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

	const member = await guild?.members.fetch(userId).catch(() => {});
	const user = member?.user || (await client.users.fetch(userId).catch(() => {}));
	const nick = member?.displayName ?? user?.username;
	const caseId = idMessage ? filter : convertBase(filter, 10, WARN_INFO_BASE);

	const embed = new EmbedBuilder()
		.setColor(member?.displayColor ?? null)
		.setAuthor(nick ? { iconURL: (member || user)?.displayAvatarURL(), name: nick } : null)
		.setTitle(`Case \`${caseId}\``)
		.setDescription(
			await fetch(message.attachments.first()?.url || "").then((response) => response.text()),
		)
		.setTimestamp(message.createdAt)
		.addFields({
			name: "⚠ Strikes",
			value: / \d+ /.exec(message.content)?.[0]?.trim() ?? "0",
			inline: true,
		});

	const moderatorId = GlobalUsersPattern.exec(message.content)?.[1] || "";
	const mod =
		isMod &&
		((await guild?.members.fetch(moderatorId).catch(() => {})) ||
			(await client.users.fetch(moderatorId).catch(() => {})));
	if (mod) embed.addFields({ name: "🛡 Moderator", value: mod.toString(), inline: true });
	if (user) embed.addFields({ name: "👤 Target user", value: user.toString(), inline: true });

	const allWarns = await removeExpiredWarns(warnLog);
	const { expiresAt } = allWarns.find((warn) => warn.info === message.id) || {};
	if (expiresAt)
		embed.addFields({
			name: "⏲ Expirery",
			value: time(new Date(expiresAt), "R"),
			inline: true,
		});

	return { ephemeral: true, embeds: [embed] };
}
