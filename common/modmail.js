/** @file Code To perform operations related to modmail tickets. */
import { MessageEmbed } from "discord.js";
import { escapeForWebhook } from "../lib/escape.js";
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
export async function generateMessage(message) {
	return {
		allowedMentions: { users: [] },
		avatarURL: message.author.avatarURL() || "",
		content: escapeForWebhook(await messageToText(message)) || undefined,

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
