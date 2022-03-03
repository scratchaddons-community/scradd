/** @file Code To perform operations related to modmail tickets. */
import { GuildMember, Message, MessageEmbed } from "discord.js";

import escapeMessage from "../lib/escape.js";
import messageToText from "../lib/messageToText.js";

export const { MODMAIL_CHANNEL = "" } = process.env;

if (!MODMAIL_CHANNEL) throw new ReferenceError("MODMAIL_CHANNEL is not set in the .env.");

export const WEBHOOK_NAME = "scradd-webhook";
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
	if (!guild) throw new TypeError("Expected guild to be passed as message is from a DM");

	const author = (await guild.members.fetch(message.author.id).catch(() => {})) || message.author;

	const embeds = message.stickers
		.map((sticker) =>
			new MessageEmbed()
				.setImage(`https://media.discordapp.net/stickers/${sticker.id}.webp?size=160`)
				.setColor("BLURPLE"),
		)
		.concat(message.embeds.map((embed) => new MessageEmbed(embed)));

	while (embeds.length > 10) embeds.pop();

	return {
		allowedMentions: { users: [] },
		avatarURL: author.displayAvatarURL(),
		content: (await messageToText(message)) || undefined,
		embeds,
		files: message.attachments.map((attachment) => attachment),
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
	return await thread.guild.members
		.fetch(/^.+ \((?<userId>\d+)\)$/.exec(thread.name)?.groups?.userId || "")
		.catch(() => {});
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

	return threads.find((thread) => thread.name.endsWith(`(${user.id})`));
}

/**
 * Let a user know that their ticket has been closed.
 *
 * @param {import("discord.js").ThreadChannel} thread - Ticket thread.
 * @param {string} [reason] - The reason for closing the ticket.
 *
 * @returns {Promise<Message<boolean> | undefined>} - The message.
 */
export async function sendClosedMessage(thread, reason) {
	const user = await getMemberFromThread(thread);
	const embed = new MessageEmbed()
		.setTitle("Modmail ticket closed!")
		.setTimestamp(thread.createdTimestamp)
		.setColor("DARK_GREEN");

	if (reason) embed.setDescription(reason);

	const dmChannel = await user?.createDM().catch(() => {});

	return await dmChannel?.send({
		embeds: [embed],
	});
}
/**
 * Close a Modmail ticket.
 *
 * @param {import("discord.js").ThreadChannel} thread - Modmail ticket thread.
 * @param {import("discord.js").User} user - User who closed the ticket.
 * @param {string} reason - The reason for closing the ticket.
 */
export async function closeModmail(thread, user, reason) {
	await Promise.all([
		sendClosedMessage(thread, reason),
		thread
			.fetchStarterMessage()
			.catch(() => {})
			.then((starter) =>
				starter?.edit({
					embeds: [
						{
							color: "DARK_GREEN",
							description: starter.embeds[0]?.description || "",
							title: "Modmail ticket closed!",
						},
					],
				}),
			),
	]);
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
					text: "Please note that reactions, replies, edits, and deletions are not supported.",
				})
				.setColor("GOLD"),
		],
	});
}
