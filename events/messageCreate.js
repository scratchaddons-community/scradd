import dotenv from "dotenv";

dotenv.config();
/** @param {import("discord.js").Message} message */
export default (message) => {
	if (message.author.bot || message.guild?.id !== process.env.GUILD_ID) return;

	if (message.mentions.users.has(message.client.user?.id || "") && message.type !== "REPLY")
		message.react("👋");

	const content = message.content.toLowerCase();

	/**
	 * @param {string} text
	 * @param {boolean} [plural]
	 */
	function includes(text, plural = true) {
		return (
			content.split(/\W+/g).includes(text) ||
			(plural &&
				(content.split(/\W+/g).includes(text + "s") ||
					content.split(/\W+/g).includes(text + "es")))
		);
	}
	if (includes("dango")) message.react("🍡");
	if (includes("potato")) message.react("🥔");
	if (includes("griff", false)) message.react("<:griffpatch:938441399936909362>");
	if (includes("amongus", false)) message.react("<:sus:938441549660975136>");
	if (includes("sus", false)) message.react("<:sus_pepe:938548233385414686>");
	if (includes("appel")) message.react("<:appel:938818517535440896>")
	if (includes("tera")) message.react("<:tewwa:938486033274785832>");
	if (content.match(/give(s)?( you)? up/)) message.react("<a:rick:938547171366682624>");
};
