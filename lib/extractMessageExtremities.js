import { Constants, MessageEmbed } from "discord.js";
import { Embed } from "@discordjs/builders";

/** @param {import("discord.js").Message} message */
export default async function extractMessageExtremities(message) {
	const embeds = [
		...message.stickers.map((sticker) =>
			new Embed()
				.setImage(`https://media.discordapp.net/stickers/${sticker.id}.webp?size=160`)
				.setColor(Constants.Colors.BLURPLE),
		),
		...message.embeds
			.filter((embed) => !embed.video)
			.map((oldEmbed) => new MessageEmbed(oldEmbed)),
	];

	while (embeds.length > 10) embeds.pop();

	return { embeds, files: message.attachments.map((attachment) => attachment) };
}
