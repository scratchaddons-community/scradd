import {
	GuildMember,
	Message,
	EmbedBuilder,
	ButtonBuilder,
	Colors,
	MessageMentions,
	ButtonStyle,
	User,
} from "discord.js";
import { generateHash } from "../lib/text.js";

import { escapeMessage } from "../lib/markdown.js";
import { asyncFilter } from "../lib/promises.js";
import { disableComponents, extractMessageExtremities, messageToText } from "../lib/discord.js";

import CONSTANTS from "./CONSTANTS.js";
import { MessageActionRowBuilder } from "./types/ActionRowBuilder.js";
import client, { guild } from "../client.js";

export const MODMAIL_COLORS = {
	opened: Colors.Gold,
	closed: Colors.DarkGreen,
	confirm: Colors.Blurple,
};

export const MODMAIL_UNSUPPORTED =
	"Please note that reactions, replies, edits, and deletions are not supported";

/**
 * Generate a webhook message from a message sent by a user.
 *
 * @param {import("discord.js").Message} message - Message sent by a user.
 *
 * @returns {Promise<import("discord.js").WebhookCreateMessageOptions>} - Webhook message.
 */
export async function generateModmailMessage(message) {
	const { files, embeds } = await extractMessageExtremities(message);

	const member =
		(message.interaction &&
			(await guild?.members.fetch(message.interaction.user.id).catch(() => {}))) ||
		message.member ||
		(await guild?.members.fetch(message.author.id).catch(() => {}));

	return {
		avatarURL: (member || message.author).displayAvatarURL(),
		content: (await messageToText(message, false)) || undefined,
		embeds,
		files,
		username: member?.displayName ?? message.author.username,
	};
}

/**
 * Given a modmail ticket thread, return the user who messages are being sent to.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 *
 * @returns User who messages are being sent to.
 */
export async function getUserFromModmail(thread) {
	const starter = await thread.fetchStarterMessage().catch(() => {});
	const embed = starter?.embeds[0];
	if (!embed?.description) return;
	const userId = embed.description.match(MessageMentions.UsersPattern)?.[1] ?? embed.description;

	return (
		(await guild.members.fetch(userId).catch(() => {})) ||
		(await client.users.fetch(userId).catch(() => {}))
	);
}

/**
 * Given a user, find a ticket thread that sends messages to them.
 *
 * @param {import("discord.js").GuildMember | import("discord.js").User} user - The user to search for.
 *
 * @returns {Promise<import("discord.js").ThreadChannel | void>} - Ticket thread.
 */
export async function getThreadFromMember(user) {
	if (!CONSTANTS.channels.modmail) return;
	const { threads } = await CONSTANTS.channels.modmail.threads.fetchActive();

	return (
		await asyncFilter(
			threads.toJSON(),
			async (thread) => (await getUserFromModmail(thread))?.id === user.id && thread,
		).next()
	).value;
}

/**
 * Let a user know that their ticket has been closed.
 *
 * @param {import("discord.js").ThreadChannel} thread - Ticket thread.
 * @param {{ reason?: string; user?: import("discord.js").User | import("discord.js").GuildMember }} meta - The reason for closing the ticket.
 *
 * @returns {Promise<Message<false> | undefined>} - Message sent to user.
 */
export async function sendClosedMessage(thread, { reason, user } = {}) {
	const member = await getUserFromModmail(thread);
	const embed = new EmbedBuilder()
		.setTitle("Modmail ticket closed!")
		.setTimestamp(thread.createdAt)
		.setFooter({
			iconURL: guild.iconURL() ?? undefined,
			text: "Any future messages will start a new ticket.",
		})
		.setColor(MODMAIL_COLORS.closed);

	if (reason) embed.setDescription(reason);

	if (user) {
		const member =
			user instanceof GuildMember
				? user
				: (await guild.members.fetch(user.id).catch(() => {})) || user;
		embed.setAuthor({
			iconURL: member.displayAvatarURL(),
			name: member instanceof GuildMember ? member.displayName : member.username,
		});
	}

	return (
		await Promise.all([
			thread
				.fetchStarterMessage()
				.catch(() => {})
				.then((starter) => {
					starter
						?.edit({
							embeds: [
								(starter.embeds[0]
									? EmbedBuilder.from(starter.embeds[0])
									: new EmbedBuilder()
								)
									.setTitle("Modmail ticket closed!")
									.setColor(MODMAIL_COLORS.closed),
							],
						})
						.catch(console.error);
				}),
			member?.send({ embeds: [embed] }),
		])
	)[1];
}
/**
 * Close a Modmail ticket.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 * @param {import("discord.js").User} user - User who closed the ticket.
 * @param {string} [reason] - The reason for closing the ticket.
 */
export async function closeModmail(thread, user, reason) {
	await sendClosedMessage(thread, { reason, user });
	await thread.setArchived(true, `Closed by ${user.tag}${reason ? ": " + reason : ""}`);
}

/**
 * Let a user know that the Mods want to talk to them.
 *
 * @param {GuildMember | User} user - The user to message.
 *
 * @returns {Promise<import("discord.js").Message<false> | false>} - The message sent.
 */
export async function sendOpenedMessage(user) {
	return await user
		.send({
			embeds: [
				new EmbedBuilder()
					.setTitle("Modmail ticket opened!")
					.setDescription(
						`The moderation team of **${escapeMessage(
							guild.name,
						)}** would like to talk to you. I will DM you their messages. You may send them messages by sending me DMs.`,
					)
					.setFooter({ text: MODMAIL_UNSUPPORTED })
					.setColor(MODMAIL_COLORS.opened),
			],
		})
		.catch(() => false);
}

/**
 * @param {EmbedBuilder} confirmEmbed
 * @param {(buttonInteraction: import("discord.js").MessageComponentInteraction) => Promise<void>} onConfirm
 * @param {(options: import("discord.js").BaseMessageOptions) => Promise<Message>} reply
 */
export async function generateModmailConfirm(confirmEmbed, onConfirm, reply) {
	const confirmId = generateHash("confirm");
	const button = new ButtonBuilder()
		.setLabel("Confirm")
		.setStyle(ButtonStyle.Primary)
		.setCustomId(confirmId);

	const cancelId = generateHash("cancel");
	const cancelButton = new ButtonBuilder()
		.setLabel("Cancel")
		.setCustomId(cancelId)
		.setStyle(ButtonStyle.Secondary);

	const message = await reply({
		components: [new MessageActionRowBuilder().addComponents(button, cancelButton)],
		embeds: [confirmEmbed],
	});

	const collector = message.createMessageComponentCollector({
		filter: (buttonInteraction) => [confirmId, cancelId].includes(buttonInteraction.customId),

		time: CONSTANTS.collectorTime,
	});
	collector
		.on("collect", async (buttonInteraction) => {
			collector.stop();
			switch (buttonInteraction.customId) {
				case confirmId: {
					await onConfirm(buttonInteraction);

					break;
				}
				case cancelId: {
					await buttonInteraction.reply({
						content: `${CONSTANTS.emojis.statuses.no} Modmail canceled!`,
						ephemeral: true,
					});

					break;
				}
			}
		})
		.on("end", async () => {
			await message.edit({ components: disableComponents(message.components) });
		});
	return collector;
}

/**
 * @param {import("discord.js").Message} message
 *
 * @returns
 */
export function generateReactionFunctions(message) {
	return /** @type {const} */ ([
		async () => {
			const reaction = await message.react(CONSTANTS.emojis.statuses.yes);
			message.channel
				.createMessageCollector({ maxProcessed: 1, time: 5_000 })
				.on("end", async () => {
					await reaction.users.remove(client.user || "");
				});
			return reaction;
		},
		/** @param {unknown} error */
		async (error) => {
			console.error(error);
			return await message.react(CONSTANTS.emojis.statuses.no);
		},
	]);
}

/**
 * @param {EmbedBuilder} openedEmbed
 * @param {string} name
 */
export async function openModmail(openedEmbed, name, ping = false) {
	if (!CONSTANTS.channels.modmail) throw new ReferenceError("Cannot find modmail channel");
	const starterMessage = await CONSTANTS.channels.modmail.send({
		allowedMentions: { parse: ["everyone"] },
		content: process.env.NODE_ENV === "production" && ping ? "@here" : undefined,
		embeds: [openedEmbed],
	});
	const date = new Date();
	const thread = await starterMessage.startThread({
		name: `${name} (${date.getUTCFullYear().toLocaleString([], { useGrouping: false })}-${date
			.getUTCMonth()
			.toLocaleString([], { minimumIntegerDigits: 2 })}-${date
			.getUTCDate()
			.toLocaleString([], { minimumIntegerDigits: 2 })})`,
	});
	await thread.setLocked(true);
	return thread;
}
