import dotenv from "dotenv";

dotenv.config();
/** @param {import("discord.js").Message} message */
export default (message) => {
	if (message.author.bot || message.guild?.id !== process.env.GUILD_ID) return;

	if (message.mentions.users.has(message.client.user?.id || "") && message.type !== "REPLY")
		message.react("👋");

	const content = message.content.toLowerCase();
	if (content.includes("dango")) message.react("🍡");
	if (content.includes("potato")) message.react("🥔");
	if (content.includes("griff")) message.react("<:griffpatch:938441399936909362>");
	if (content.includes("amongus")) message.react("<:sus:938441549660975136>");
	if (content.includes("sus")) message.react("<:sus_pepe:938548233385414686>");
	if (content.match(/scratch(?! ?add-?ons?)/gisu)) message.react("<:scratch:938450741457199254>");
	if (content.match(/scratch ?add-?ons?/gisu))
		message.react("<:scratchaddons:938452056908382218>");
	if (content.match(/(?<!scratch ?)add-?ons?/gisu))
		message.react("<:new_addon:938441600655306773>");
	if (content.includes("scradd")) message.react("<:scradd:938546044726300722>");
	if (content.includes("colander")) message.react("<:colaber:938480402752995408>");
	if (content.includes("tera")) message.react("<:tewwa:938486033274785832>");
	if (content.match(/give( you)? up/)) message.react("<a:rick:938547171366682624>");
};
