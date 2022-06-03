import { Embed, SlashCommandBuilder } from "@discordjs/builders";
import { GuildMember, MessageActionRow, MessageButton, MessageMentions } from "discord.js";
import fetch from "node-fetch";
import CONSTANTS from "../common/CONSTANTS.js";
import { getDatabases } from "../common/databases.js";
import { getThread } from "../common/moderation/logging.js";
import { getData } from "../common/moderation/warns.js";
import { convertBase } from "../lib/text.js";

/** @type {import("../types/command").default} */
const info = {
	data: new SlashCommandBuilder()
		.setDescription("View your or (Mods only) someone else's active strikes.")
		.addStringOption((input) =>
			input
				.setName("filter")
				.setDescription(
					"Type a case ID to see its details, a ping to see their strikes, or leave blank to see your strikes.",
				)
				.setRequired(false),
		),

	async interaction(interaction) {
		if (!(interaction.member instanceof GuildMember))
			throw new TypeError("Member is not a GuildMember");
		return getWarns(
			async (data) => await interaction.reply(data),
			interaction.options.getString("filter"),
			interaction.member,
		);
	},
	censored: false,
};

export default info;

let /** @type {import("discord.js").Message} */ warnLog,
	/** @type {import("discord.js").Message} */ muteLog;

/**
 * @param {import("discord.js").User | import("discord.js").GuildMember} user
 * @param {import("discord.js").Guild | null} guild
 *
 * @returns {Promise<import("discord.js").InteractionReplyOptions>}
 */
async function getWarnsForMember(user, guild = user instanceof GuildMember ? user.guild : null) {
	const modTalk = guild?.publicUpdatesChannel;
	if (!modTalk) throw new ReferenceError("Could not find mod talk");
	if (!warnLog || !muteLog) {
		const databases = await getDatabases(["warn", "mute"], modTalk);
		warnLog = databases.warn;
		muteLog = databases.mute;
	} else {
		warnLog = await warnLog.fetch();
		muteLog = await muteLog.fetch();
	}
	const [allWarns, allMutes] = await Promise.all([getData(warnLog, true), getData(muteLog)]);
	const warns = allWarns.filter((warn) => warn.user === user.id);
	const mutes = allMutes.filter((mute) => mute.user === user.id);

	const member = user instanceof GuildMember ? user : await guild?.members.fetch(user.id);

	const strikes = await Promise.all(
		warns
			.filter((warn, index) => warns.findIndex((w) => w.info == warn.info) == index)
			.sort((one, two) => two.expiresAt - one.expiresAt),
	);
	const embed = new Embed()
		.setTitle(
			`${member.displayName} has ${warns.length} active strike${
				warns.length === 1 ? "" : "s"
			}`,
		)
		.setAuthor({ iconURL: member.displayAvatarURL(), name: member.displayName })
		.setColor(member.displayColor)
		.setDescription(
			(
				await Promise.all(
					strikes.map(async (warn) => {
						const strikes = warns.filter(({ info }) => info === warn.info).length;

						return `\`${convertBase(warn.info || "", 10, 64)}\`${
							strikes === 1 ? "" : ` (*${strikes})`
						}: expiring <t:${Math.round(warn.expiresAt / 1_000)}:R>`;
					}),
				)
			).join("\n") || `${user.toString()} has no recent strikes!`,
		);
	if (mutes.length)
		embed.setFooter({
			text:
				`${member.displayName} has been muted ` +
				mutes.length +
				` time${mutes.length === 1 ? "" : "s"} recently.`,
		});
	return {
		components: strikes.length
			? [
					new MessageActionRow().addComponents(
						strikes.map((warn) =>
							new MessageButton()
								.setLabel(convertBase(warn.info || "", 10, 64))
								.setStyle("SECONDARY")
								.setCustomId(`${convertBase(warn.info || "", 10, 64)}_strike`),
						),
					),
			  ]
			: [],
		embeds: [embed],
	};
}

/**
 * @param {(
 * 	options:
 * 		| string
 * 		| import("discord.js").InteractionReplyOptions
 * 		| import("discord.js").MessagePayload,
 * ) => Promise<void>} reply
 * @param {string | null} filter
 * @param {import("discord.js").GuildMember} interactor
 *
 * @returns
 */
export async function getWarns(reply, filter, interactor) {
	if (filter) {
		const pinged = filter.matchAll(MessageMentions.USERS_PATTERN).next().value?.[1];
		if (pinged) {
			const user = await interactor.client.users.fetch(pinged);

			if (!user) return await reply(`${CONSTANTS.emojis.statuses.no} Invalid filter!`);

			await reply(await getWarnsForMember(user, interactor.guild));
		} else {
			const id = convertBase(filter, 64, 10);
			const channel = interactor.guild && (await getThread("members", interactor.guild));

			const idMessage = await channel?.messages.fetch(id).catch(() => {});
			const message = idMessage || (await channel?.messages.fetch(filter).catch(() => {}));

			if (!message) return await reply(`${CONSTANTS.emojis.statuses.no} Invalid filter!`);

			const reason = await fetch(message.attachments.first()?.url || "").then((response) =>
				response.text(),
			);
			const matched = message.content.matchAll(MessageMentions.USERS_PATTERN);
			const userId = matched.next().value?.[1];

			const member = await interactor.guild?.members.fetch(userId).catch(() => {});

			const user =
				member?.user || (await interactor.client.users.fetch(userId).catch(() => {}));

			const nick = member?.displayName ?? user?.username;

			const moderatorId = matched.next().value?.[1];

			const mod =
				(await interactor.guild?.members.fetch(moderatorId).catch(() => {})) ||
				(await interactor.client.users.fetch(moderatorId).catch(() => {}));

			const modTalk = interactor.guild?.publicUpdatesChannel;
			if (!modTalk) throw new ReferenceError("Could not find mod talk");
			warnLog = (await warnLog?.fetch()) || (await getDatabases(["warn"], modTalk)).warn;
			const allWarns = await getData(warnLog, true);
			const caseId = idMessage ? filter : convertBase(filter, 10, 64);
			const { expiresAt } = allWarns.find((warn) => warn.info === message.id) || {};

			const embed = new Embed()
				.setColor(member?.displayColor ?? null)
				.setAuthor(
					nick
						? {
								iconURL: (member || user)?.displayAvatarURL(),
								name: nick,
						  }
						: null,
				)
				.setTitle(`Case \`${caseId}\``)
				.setDescription(reason)
				.setTimestamp(message.createdAt);

			const strikes = / \d+ /.exec(message.content)?.[0]?.trim() ?? "0";
			embed.addField({
				name: "Strikes",
				value: strikes,
				inline: true,
			});

			if (
				mod &&
				interactor instanceof GuildMember &&
				interactor.roles.resolve(process.env.MODERATOR_ROLE || "")
			)
				embed.addField({ name: "Moderator", value: mod.toString(), inline: true });

			if (user)
				embed.addField({
					name: "Target user",
					value: user.toString(),
					inline: true,
				});

			if (expiresAt)
				embed.addField({
					name: "Expirery",
					value: `<t:${Math.round(expiresAt / 1_000)}:R>`,
					inline: true,
				});

			await reply({
				embeds: [embed],
			});
		}
	} else {
		await reply(await getWarnsForMember(interactor, interactor.guild));
		return;
	}
}
