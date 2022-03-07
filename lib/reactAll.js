/**
 * @param {import("discord.js").Message} message
 * @param {import("discord.js").EmojiIdentifierResolvable[]} reactions
 */
export default async function reactAll(message, reactions) {
	for (const reaction of reactions) {
		await message.react(reaction);
	}
}
