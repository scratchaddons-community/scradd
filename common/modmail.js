import {
	GuildMember,
	Message,
	MessageEmbed,
	MessageActionRow,
	MessageButton,
	Constants,
	MessageMentions,
} from "discord.js";
import { generateHash } from "../lib/text.js";
import { Embed } from "@discordjs/builders";

import { escapeMessage } from "../lib/markdown.js";
import { asyncFilter } from "../lib/promises.js";
import { extractMessageExtremities, messageToText } from "../lib/message.js";

import CONSTANTS from "./CONSTANTS.js";

export const { MODMAIL_CHANNEL = "" } = process.env;

if (!MODMAIL_CHANNEL) throw new ReferenceError("MODMAIL_CHANNEL is not set in the .env.");

export const COLORS = {
	opened: Constants.Colors.GOLD,
	closed: Constants.Colors.DARK_GREEN,
	confirm: Constants.Colors.BLURPLE,
};

export const UNSUPPORTED =
	"Please note that reactions, replies, edits, and deletions are not supported" +
	CONSTANTS.footerSeperator +
	"Messages starting with an equals sign (=) are ignored.";

/**
 * Generate a webhook message from a message sent by a user.
 *
 * @param {import("discord.js").Message} message - Message sent by a user.
 *
 * @returns {Promise<
 * 	(import("discord.js").WebhookMessageOptions & { threadId?: undefined }) &
 * 		(import("discord.js").MessagePayload | import("discord.js").MessageOptions)
 * >}
 *   - Webhook message.
 */
export async function generateMessage(message) {
	const { files, embeds } = await extractMessageExtremities(message);

	const member =
		(message.interaction &&
			(await message.guild?.members.fetch(message.interaction.user.id))) ||
		message.member ||
		(await message.guild?.members.fetch(message.author.id));

	return {
		avatarURL: (member || message.interaction?.user || message.author)?.displayAvatarURL(),
		content: (await messageToText(message, false)) || undefined,
		embeds,
		files,
		username: member?.displayName ?? (message.interaction?.user || message.author).username,
	};
}

/**
 * Given a modmail ticket thread, return the user who messages are being sent to.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 *
 * @returns {Promise<import("discord.js").GuildMember | void | { id: string }>} - User who messages
 *   are being sent to.
 */
export async function getMemberFromThread(thread) {
	const starter = await thread.fetchStarterMessage().catch(() => {});
	const embed = starter?.embeds[0];
	if (!embed?.description) return;
	const userId =
		embed.description.matchAll(MessageMentions.USERS_PATTERN).next().value?.[1] ??
		embed.description;

	return (await thread.guild.members.fetch(userId).catch(() => {})) || { id: userId };
}

/**
 * Given a user, find a ticket thread that sends messages to them.
 *
 * @param {import("discord.js").GuildMember | import("discord.js").User} user - The user to search for.
 * @param {import("discord.js").Guild} [guild] - The guild to search in.
 *
 * @returns {Promise<import("discord.js").ThreadChannel | void>} - Ticket thread.
 */
export async function getThreadFromMember(
	user,
	guild = user instanceof GuildMember ? user.guild : undefined,
) {
	if (!guild) throw new TypeError("Expected guild to be passed along with a User.");
	const mailChannel = await guild.channels.fetch(MODMAIL_CHANNEL);

	if (!mailChannel) throw new ReferenceError("Could not find modmail channel");

	if (mailChannel.type !== "GUILD_TEXT")
		throw new TypeError("Modmail channel is not a text channel");

	const { threads } = await mailChannel.threads.fetchActive();

	return (
		await asyncFilter(
			threads,
			async (thread) => (await getMemberFromThread(thread))?.id === user.id && thread,
		).next()
	).value;
}

/**
 * Let a user know that their ticket has been closed.
 *
 * @param {import("discord.js").ThreadChannel} thread - Ticket thread.
 * @param {{
 * 	reason?: string;
 * 	user?: import("discord.js").User | import("discord.js").GuildMember;
 * }} [meta]
 *   - The reason for closing the ticket.
 *
 *
 * @returns {Promise<Message<boolean> | false>} - Message sent to user.
 */
export async function sendClosedMessage(thread, { reason, user } = {}) {
	const member = await getMemberFromThread(thread);
	const embed = new Embed()
		.setTitle("Modmail ticket closed!")
		.setTimestamp(thread.createdAt)
		.setFooter({
			iconURL: thread.guild.iconURL() ?? undefined,
			text: "Any future messages will start a new ticket.",
		})
		.setColor(Constants.Colors.DARK_GREEN);

	if (reason) embed.setDescription(reason);

	if (user) {
		const member =
			user instanceof GuildMember
				? user
				: (await thread.guild.members.fetch(user.id).catch(() => {})) || user;
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
								new MessageEmbed(starter.embeds[0])
									.setTitle("Modmail ticket closed!")
									.setColor(Constants.Colors.DARK_GREEN),
							],
						})
						.catch(console.error);
				}),
			member instanceof GuildMember && member?.send({ embeds: [embed] }),
		])
	)[1];
}
/**
 * Close a Modmail ticket.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 * @param {import("discord.js").GuildMember | import("discord.js").User} user - User who closed the ticket.
 * @param {string} [reason] - The reason for closing the ticket.
 */
export async function closeModmail(thread, user, reason) {
	await sendClosedMessage(thread, { reason, user });
	await thread.setArchived(
		true,
		`Closed by ${(user instanceof GuildMember ? user.user : user).tag}: ${reason}`,
	);
}

/**
 * Let a user know that the Mods want to talk to them.
 *
 * @param {GuildMember} user - The user to message.
 *
 * @returns {Promise<import("discord.js").Message | false>} - The message sent.
 */
export async function sendOpenedMessage(user) {
	return await user
		.send({
			embeds: [
				new Embed()
					.setTitle("Modmail ticket opened!")
					.setDescription(
						`The moderation team of **${escapeMessage(
							user.guild.name,
						)}** would like to talk to you. I will DM you their messages. You may send them messages by sending me DMs.`,
					)
					.setFooter({ text: UNSUPPORTED })
					.setColor(COLORS.opened),
			],
		})
		.catch(() => false);
}

/**
 * @param {Embed} confirmEmbed
 * @param {(
 * 	options: import("discord.js").InteractionReplyOptions & import("discord.js").MessageOptions,
 * ) => Promise<Message | import("discord-api-types").APIMessage>} reply
 * @param {(
 * 	options: import("discord.js").InteractionReplyOptions & import("discord.js").MessageOptions,
 * ) => Promise<Message | import("discord-api-types").APIMessage>} edit
 * @param {(
 * 	buttonInteraction: import("discord.js").MessageComponentInteraction,
 * ) => Promise<void>} onConfirm
 */
export async function generateConfirm(confirmEmbed, onConfirm, reply, edit) {
	const button = new MessageButton()
		.setLabel("Confirm")
		.setStyle("PRIMARY")
		.setCustomId(generateHash("confirm"));
	const cancelButton = new MessageButton()
		.setLabel("Cancel")
		.setCustomId(generateHash("cancel"))
		.setStyle("SECONDARY");

	const message = await reply({
		components: [new MessageActionRow().addComponents(button, cancelButton)],
		embeds: [confirmEmbed],
	});

	if (message instanceof Message) {
		const collector = message.channel.createMessageComponentCollector({
			filter: (buttonInteraction) =>
				[button.customId, cancelButton.customId].includes(buttonInteraction.customId),

			time: 30_000,
		});
		collector
			.on("collect", async (buttonInteraction) => {
				collector.stop();
				switch (buttonInteraction.customId) {
					case button.customId: {
						await onConfirm(buttonInteraction);

						break;
					}
					case cancelButton.customId: {
						await buttonInteraction.reply({
							content: `${CONSTANTS.emojis.statuses.no} Modmail canceled!`,
							ephemeral: true,
						});

						break;
					}
				}
			})
			.on("end", async () => {
				await edit({
					components: [
						new MessageActionRow().addComponents(
							button.setDisabled(true),
							cancelButton.setDisabled(true),
						),
					],

					embeds: [confirmEmbed],
				});
			});
		return collector;
	}
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
					await reaction.users.remove(reaction.client.user || "");
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
 * @param {import("discord.js").TextChannel} mailChannel
 * @param {Embed} openedEmbed
 * @param {string} name
 */
export async function openModmail(mailChannel, openedEmbed, name, ping = false) {
	const starterMessage = await mailChannel.send({
		allowedMentions: { parse: ["everyone"] },
		content: process.env.NODE_ENV === "production" && ping ? "@here" : undefined,
		embeds: [openedEmbed],
	});
	const thread = await starterMessage.startThread({
		name: `${name} (${new Date().getUTCFullYear()}-${new Date().getUTCMonth()}-${new Date().getUTCDate()})`,
		autoArchiveDuration: "MAX",
	});
	await thread.setLocked(true);
	return thread;
}
