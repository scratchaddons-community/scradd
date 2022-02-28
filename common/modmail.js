/** @file Code To perform operations related to modmail tickets. */
import { GuildMember, MessageEmbed } from "discord.js";
import escape, { escapeForLinkOrWebhook } from "../lib/escape.js";
import messageToText from "../lib/messageToText.js";

export const { MODMAIL_CHANNEL = "" } = process.env;

if (!MODMAIL_CHANNEL) throw new Error("MODMAIL_CHANNEL is not set in the .env.");

export const WEBHOOK_NAME = "scradd-webhook";
/**
 * Generate a webhook message from a message sent by a user.
 *
 * @param {import("discord.js").Message} message - Message sent by a user.
 *
 * @returns {Promise<
 * 	(import("discord.js").WebhookMessageOptions & {
 * 		threadId?: undefined;
 * 	}) &
 * 		(import("discord.js").MessagePayload | import("discord.js").MessageOptions)
 * >}
 *   - Webhook message.
 */
export async function generateMessage(message, guild = message.guild) {
	if (!guild) throw new Error("Expected guild to be passed as message is from a DM");
	const author = await guild.members.fetch(message.author.id);
	return {
		allowedMentions: { users: [] },
		avatarURL: author.displayAvatarURL(),
		content: escapeForLinkOrWebhook(await messageToText(message)) || undefined,

		embeds: message.stickers
			.map((sticker) =>
				new MessageEmbed().setImage(
					`https://media.discordapp.net/stickers/${sticker.id}.webp?size=160`,
				),
			)
			.concat(message.embeds.map((embed) => new MessageEmbed(embed)))
			.splice(10),

		files: message.attachments.map((attachment) => attachment),
		username: message.author.username,
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

	if (!mailChannel) throw new Error("Could not find modmail channel");

	if (mailChannel.type !== "GUILD_TEXT") throw new Error("Modmail channel is not a text channel");

	const { threads } = await mailChannel.threads.fetchActive();

	return threads.find((thread) => thread.name.endsWith(`(${user.id})`));
}

/**
 * @param {import("discord.js").ThreadChannel} thread
 * @param {import("discord.js").User} user
 * @param {string} reason
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
							color: 0x008000,
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
 * @param {import("discord.js").ThreadChannel} thread
 * @param {string} [reason]
 *
 * @returns
 */
export async function sendClosedMessage(thread, reason) {
	const user = await getMemberFromThread(thread);
	const embed = new MessageEmbed()
		.setTitle("Modmail ticket closed!")
		.setTimestamp(thread.createdTimestamp)
		.setColor(32768);
	if (reason) embed.setDescription(reason);
	const dmChannel = await user?.createDM().catch(() => {});
	return await dmChannel?.send({
		embeds: [embed],
	});
}

/**
 * @param {GuildMember} user
 *
 * @returns
 */
export async function sendOpenedMessage(user) {
	const dmChannel = await user.createDM().catch(() => {});

	if (!dmChannel) return false;
	return await dmChannel.send({
		embeds: [
			new MessageEmbed()
				.setTitle("Modmail ticket opened")
				.setDescription(
					`The moderation team of ${escape(
						user.guild.name,
					)} would like to talk to you. I will DM you their messages. You may send them messages by sending me DMs.`,
				)
				.setFooter({
					text: "Please note that reactions, replies, edits, and deletes are not supported.",
				})
				.setColor("BLURPLE"),
		],
	});
}
