import { MessageEmbed } from "discord.js";

/** @param {import("discord.js").Message} message */
export default async function extractMessageExtremities(
	message,
	guild = message.guild || undefined,
) {
	if (!guild) throw new TypeError("Expected guild to be passed as message is from a DM");

	const author = (await guild.members.fetch(message.author.id).catch(() => {})) || message.author;

	const embeds = [
		...message.stickers.map((sticker) =>
			new MessageEmbed()
				.setImage(`https://media.discordapp.net/stickers/${sticker.id}.webp?size=160`)
				.setColor("BLURPLE"),
		),
		...message.embeds
			.filter((embed) => !embed.video)
			.map((oldEmbed) => new MessageEmbed(oldEmbed)),
	];

	while (embeds.length > 10) embeds.pop();

	return { author, embeds, files: message.attachments.map((attachment) => attachment) };
}
