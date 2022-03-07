/** @file Code To perform operations related to modmail tickets. */
import { GuildMember, Message, MessageEmbed, MessageActionRow, MessageButton } from "discord.js";
import generateHash from "../lib/generateHash.js";

import escapeMessage from "../lib/escape.js";
import messageToText from "../lib/messageToText.js";
import asyncFilter from "../lib/asyncFilter.js";
import extractMessageExtremities from "../lib/extractMessageExtremities.js";

export const { MODMAIL_CHANNEL = "" } = process.env;

if (!MODMAIL_CHANNEL) throw new ReferenceError("MODMAIL_CHANNEL is not set in the .env.");

export const COLORS = {
	/** @type {import("discord.js").ColorResolvable} */ opened: "GOLD",
	/** @type {import("discord.js").ColorResolvable} */ closed: "DARK_GREEN",
};
export const UNSUPPORTED =
	"Please note that reactions, replies, edits, and deletions are not supported.";
/**
 * Generate a webhook message from a message sent by a user.
 *
 * @param {import("discord.js").Message} message - Message sent by a user.
 * @param {import("discord.js").Guild} [guild] - The guild to search. Defaults to the message’s guild.
 *
 * @returns {Promise<
 * 	(import("discord.js").WebhookMessageOptions & {
 * 		threadId?: undefined;
 * 	}) &
 * 		(import("discord.js").MessagePayload | import("discord.js").MessageOptions)
 * >}
 *   - Webhook message.
 */
export async function generateMessage(message, guild = message.guild || undefined) {
	const { author, files, embeds } = await extractMessageExtremities(message, guild);

	return {
		allowedMentions: { users: [] },
		avatarURL: author.displayAvatarURL(),
		content: await messageToText(message, false),
		embeds,
		files,
		username: author instanceof GuildMember ? author.displayName : author.username,
	};
}

/**
 * Given a modmail ticket thread, return the user who messages are being sent to.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 *
 * @returns {Promise<import("discord.js").GuildMember | void>} - User who messages are being sent to.
 */
export async function getMemberFromThread(thread) {
	const starter = await thread.fetchStarterMessage().catch(() => {});
	const embed = starter?.embeds[0];
	if (!embed?.description) return;
	const userId =
		/<@!?(?<userId>\d+)>/.exec(embed.description)?.groups?.userId || embed.description;

	return await thread.guild.members.fetch(userId).catch(() => {});
}

/**
 * Given a user, find a ticket thread that sends messages to them.
 *
 * @param {import("discord.js").Guild} guild - The guild to search in.
 * @param {import("discord.js").GuildMember | import("discord.js").User} user - The user to search for.
 *
 * @returns {Promise<import("discord.js").ThreadChannel | void>} - Ticket thread.
 */
export async function getThreadFromMember(guild, user) {
	const mailChannel = await guild?.channels.fetch(MODMAIL_CHANNEL);

	if (!mailChannel) throw new ReferenceError("Could not find modmail channel");

	if (mailChannel.type !== "GUILD_TEXT")
		throw new TypeError("Modmail channel is not a text channel");

	const { threads } = await mailChannel.threads.fetchActive();

	return (
		await asyncFilter(
			threads,
			async (thread) => (await getMemberFromThread(thread))?.id === user.id,
		).next()
	).value;
}

/**
 * Let a user know that their ticket has been closed.
 *
 * @param {import("discord.js").ThreadChannel} thread - Ticket thread.
 * @param {string} [reason] - The reason for closing the ticket.
 *
 * @returns {Promise<Message<boolean> | undefined>} - Message sent to user.
 */
export async function sendClosedMessage(thread, reason) {
	const user = await getMemberFromThread(thread);
	const embed = new MessageEmbed()
		.setTitle("Modmail ticket closed!")
		.setTimestamp(thread.createdTimestamp)
		.setColor("DARK_GREEN");

	if (reason) embed.setDescription(reason);

	const dmChannel = await user?.createDM().catch(() => {});

	return (
		await Promise.all([
			thread
				.fetchStarterMessage()
				.catch(() => {})
				.then((starter) => {
					starter?.edit({
						embeds: [
							{
								color: "DARK_GREEN",
								description: starter.embeds[0]?.description || "",
								title: "Modmail ticket closed!",
							},
						],
					});
				}),
			dmChannel?.send({
				embeds: [embed],
			}),
		])
	)[1];
}
/**
 * Close a Modmail ticket.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 * @param {import("discord.js").User} user - User who closed the ticket.
 * @param {string} reason - The reason for closing the ticket.
 */
export async function closeModmail(thread, user, reason) {
	await sendClosedMessage(thread, reason);
	await thread.setLocked(true, `Closed by ${user.tag}: ${reason}`);
	await thread.setArchived(true, `Closed by ${user.tag}: ${reason}`);
}

/**
 * Let a user know that the Mods want to talk to them.
 *
 * @param {GuildMember} user - The user to message.
 *
 * @returns {Promise<import("discord.js").Message | false>} - The message sent.
 */
export async function sendOpenedMessage(user) {
	const dmChannel = await user.createDM().catch(() => {});

	if (!dmChannel) return false;

	return await dmChannel.send({
		embeds: [
			new MessageEmbed()
				.setTitle("Modmail ticket opened!")
				.setDescription(
					`The moderation team of ${escapeMessage(
						user.guild.name,
					)} would like to talk to you. I will DM you their messages. You may send them messages by sending me DMs.`,
				)
				.setFooter({
					text: UNSUPPORTED,
				})
				.setColor(COLORS.opened),
		],
	});
}

/**
 * @param {{ display: string; icon?: string; name: string }} receiver
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
export async function generateConfirm(receiver, onConfirm, reply, edit) {
	const confirmEmbed = new MessageEmbed()
		.setTitle("Confirmation")
		.setDescription(`Are you sure you want to send this message to **${receiver.display}**?`)
		.setColor("BLURPLE")
		.setAuthor({
			iconURL: receiver.icon,
			name: receiver.name,
		});

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
