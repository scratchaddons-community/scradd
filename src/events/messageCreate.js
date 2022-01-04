/** @param {import("discord.js").Message<boolean>} message */
export default (message) => {
	const content=message.content.toLowerCase()
	if (content.includes("dango")) message.react("🍡")
	if (message.mentions.users.has(message.client.user?.id || "")) message.react("👋");
	if (content.includes("griff")) message.react("927763388740816899");
	if (content.includes("sus")) message.react("927763785140273152")
	if (content.includes("new")) message.react("927763892392845342")
	if (content.includes("scratch")) message.react("927763958406975558")
}
