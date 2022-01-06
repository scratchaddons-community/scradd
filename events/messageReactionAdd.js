import { MessageEmbed } from "discord.js";

/** @param {string} attachment */
function extension(attachment = "") {
	const imageLink = attachment.split(".");
	const typeOfImage = imageLink[imageLink.length - 1];
	if (!typeOfImage) return "";
	const image = /(jpg|jpeg|png|gif)/gi.test(typeOfImage);
	if (!image) return "";
	return attachment;
}

const POTATO_BOARD = "928475852084240465";
/**
 * @param {import("discord.js").MessageReaction} reaction
 * @param {import("discord.js").User} user
 */

export default async (reaction, user) => {
	const message = reaction.message;
	if (!message.author || !message.guild) return;
	if (reaction.emoji.name !== "🥔") return;
	const starChannel = message.guild.channels.cache.get(POTATO_BOARD);
	if (!starChannel?.isThread()) return;
	const fetchedMessages = await starChannel.messages.fetch({ limit: 100 });
	const stars = fetchedMessages.find((m) => m.embeds[0].footer.text === message.id);
	if (stars) {
		const foundStar = stars.embeds[0];
		const image = extension(message.attachments.first()?.url);
		const embed = new MessageEmbed()
			.setColor(foundStar.color)
			.setDescription(foundStar.description)
			.setAuthor({
				name: message.author.tag,
				iconURL: message.author.avatarURL() || "",
			})
			.setTimestamp()
			.setFooter({ text: message.id })
			.setImage(image);
		const starMsg = await starChannel.messages.fetch(stars.id);
		await starMsg.edit({
			content: `🥔 ${
				reaction.count
			} | ${message.channel.toString()} (${message.author.toString()})`,
			embeds: [embed],
		});
	}
	if (!stars) {
		const image = extension(message.attachments.first()?.url);

		const embed = new MessageEmbed()
			.setColor(0xf1c40f)
			.setDescription(message.cleanContent || "")
			.setAuthor({
				name: message.author.tag,
				iconURL: message.author.avatarURL() || "",
			})
			.setTimestamp(new Date())
			.setFooter({ text: message.id })
			.setImage(image);
		await starChannel.send({
			content:
				"**🥔 ${reaction.count}** | " +
				message.channel +
				" | " +
				message.author,
			embeds: [embed],
		});
	}
};
