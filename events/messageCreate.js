import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import generateHash from "../lib/generateHash.js";
import dotenv from "dotenv";

dotenv.config();
const { GUILD_ID } = process.env;
if (!GUILD_ID) throw new Error("GUILD_ID is not set in the .env.");

/** @param {string} userId */
function topicFormat(userId) {
	return "ModMail Channel for " + userId;
}

/** @param {import("discord.js").Message} message */
export default async (message) => {
	if (message.author.id === message.client.user?.id) return;

	if (message.channel.type === 'DM') {
		const guild = await message.client.guilds.fetch(GUILD_ID);
		const channels = await guild.channels.fetch()
		for (const [, channel] of channels) {
			if (channel.type !== "GUILD_TEXT") continue
			if (channel.topic === topicFormat(message.author.id)) {
				channel.send(message.content);
				return;
			}
		}

		// send message in embed with a button
		const embed = new MessageEmbed()
			.setTitle("Confimation")
			.setDescription(
				"You are sending this message to the Scratch Addons Server. If you are sure you would like to do this, press the button below."
			)
			.setColor("BLURPLE");
		const button = new MessageButton()
			.setLabel("Confirm")
			.setStyle("PRIMARY")
			.setCustomId(generateHash("confirm"));
		const  sentMsg = await  message.channel.send({
			embeds: [embed],
			components: [new MessageActionRow()
				.addComponents(button)],
		});

		 message.channel.createMessageComponentCollector({
			filter: (i) =>button.customId === i.customId,
			time: 15_000,
		})

			.on("collect", async (i) => {
				const channel = await guild.channels.create(message.author.username + message.author.discriminator, {
					type: "GUILD_TEXT",
					topic: topicFormat(message.author.id)
				});
				
				channel.send(message.content);
				i.deferReply()
			})
			.on("end", async () => {
				button.setDisabled(true);
				sentMsg.edit({
					embeds: [embed],
					components: [new MessageActionRow()
						.addComponents(button)]
				});
			});


		return;
	}
	
	if (message.channel.type === "GUILD_TEXT" && message.channel.topic?.startsWith(topicFormat(""))) {
		const userId = message.channel.topic.split(topicFormat(""))[1];
		const user = await message.client.users.fetch(userId || "");
		if (!user) return;
		const channel = await user.createDM();
		channel.send(message.content);
		return;
	}

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
	if (includes("appel")) message.react("<:appel:938818517535440896>");
	if (includes("tera")) message.react("<:tewwa:938486033274785832>");
	if (content.match(/gives?( you)? up/)) message.react("<a:rick:938547171366682624>");
};
