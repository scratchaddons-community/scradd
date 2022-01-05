/** @param {import("discord.js").Message<boolean>} message */
export default (message) => {
	const content = message.content.toLowerCase();
	if (message.mentions.users.has(message.client.user?.id || "")) react("👋");
	if (content.includes("dango")) react("🍡");
	if (content.includes("griff")) react("927763388740816899");
	if (content.includes("sus")) react("927763785140273152");
	if (content.includes("new")) react("927763892392845342");
	if (content.includes("scratch")) react("927763958406975558");

	/** @param {import("discord.js").EmojiIdentifierResolvable} reaction */
	function react(reaction) {
		message.react(reaction).catch(() => {});
	}
};
