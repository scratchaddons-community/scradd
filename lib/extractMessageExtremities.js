import { MessageEmbed } from "discord.js";

/** @param {import("discord.js").Message | import("discord.js").PartialMessage} message */
export default async function extractMessageExtremities(message) {
	const embeds = [
		...message.stickers.map((sticker) =>
			new MessageEmbed().setImage(
				`https://media.discordapp.net/stickers/${sticker.id}.webp?size=160`,
			),
		),
		...message.embeds
			.filter((embed) => !embed.video)
			.map((oldEmbed) => {
				const newEmbed = new MessageEmbed(oldEmbed);
				return newEmbed;
			}),
	];

	while (embeds.length > 10) embeds.pop();

	return {
		embeds,
		files: message.attachments.toJSON(),
	};
}
