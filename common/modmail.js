import {
	Client,
	Guild,
	GuildMember,
	Message,
	MessageEmbed,
	MessagePayload,
	ThreadChannel,
	User,
} from "discord.js";
export const { MODMAIL_CHANNEL = "" } = process.env;
if (!MODMAIL_CHANNEL) throw new Error("MODMAIL_CHANNEL is not set in the .env.");
export const WH_NAME = "scradd-wh";
/**
 * @param {Message} message
 *
 * @returns {(import("discord.js").WebhookMessageOptions & {
 * 	threadId?: undefined;
 * }) &
 * 	(MessagePayload | import("discord.js").MessageOptions)}
 */
export function generateMessage(message) {
	message.react("<:yes:940054094272430130>");
	return {
		content: message.content || undefined,
		username: message.author.username,
		files: message.attachments.map((a) => a),
		allowedMentions: { users: [] },

		avatarURL: message.author.avatarURL() || "",
		embeds: message.stickers
			.map((sticker) => {
				return new MessageEmbed()
					.setDescription("")
					.setImage(
						`https://media.discordapp.net/stickers/` + sticker.id + `.webp?size=160`,
					);
			})
			.concat(message.embeds.map((a) => new MessageEmbed(a))), //.splice(10),
	};
}

/**
 * @param {Guild} guild
 * @param {ThreadChannel} thread
 */
export function getMemberFromThread(guild, thread) {
	return guild.members.fetch(thread.name.match(/^.+ \((\d+)\)$/i)?.[1] || "").catch(() => {});
}

/**
 * @param {Guild} guild
 * @param {GuildMember | User} user
 */
export async function getThreadFromMember(guild, user) {
	const mailChannel = await guild?.channels.fetch(MODMAIL_CHANNEL);
	if (!mailChannel) throw new Error("Could not find modmail channel");
	if (mailChannel.type !== "GUILD_TEXT") throw new Error("Modmail channel is not a text channel");
	const { threads } = await mailChannel.threads.fetchActive();
	return threads.find((thread) => thread.name.endsWith("(" + user.id + ")"));
}
