import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import generateHash from "../lib/generateHash.js";
import dotenv from "dotenv";

dotenv.config();
const { MODMAIL_CHANNEL, GUILD_ID } = process.env;
if (!GUILD_ID) throw new Error("GUILD_ID is not set in the .env.");
if (!MODMAIL_CHANNEL) throw new Error("MODMAIL_CHANNEL is not set in the .env.");

const WH_NAME = "scradd-wh";

/** @param {import("discord.js").Message} message */
export default async (message) => {
	if (message.author.id === message.client.user?.id) return;

	if (message.channel.type === "DM") {
		const guild = await message.client.guilds.fetch(GUILD_ID);
		const mailChannel = await guild.channels.fetch(MODMAIL_CHANNEL);
		if (!mailChannel) throw new Error("Could not find modmail channel");
		if (mailChannel.type !== "GUILD_TEXT")
			throw new Error("Modmail channel is not a text channel");
		const webhooks = await mailChannel.fetchWebhooks();
		let webhook = webhooks.find((wh) => wh.name === WH_NAME);
		if (!webhook) {
			webhook = await mailChannel.createWebhook(WH_NAME);
		}

		const { threads } = await mailChannel.threads.fetch();
		for (const [, thread] of threads) {
			const starter = await thread.fetchStarterMessage();
			if (starter.embeds[0]?.description === message.author.id) {
				webhook.send({
					threadId: thread.id,
					content: message.content,
					username: message.author.username,
					avatarURL: message.author.avatarURL() || "",
				});
				return;
			}
		}

		const embed = new MessageEmbed()
			.setTitle("Confimation")
			.setDescription(
				"You are sending this message to the Scratch Addons Server. If you are sure you would like to do this, press the button below.",
			)
			.setColor("BLURPLE");
		const button = new MessageButton()
			.setLabel("Confirm")
			.setStyle("PRIMARY")
			.setCustomId(generateHash("confirm"));
		const sentMsg = await message.channel.send({
			embeds: [embed],
			components: [new MessageActionRow().addComponents(button)],
		});

		message.channel.createMessageCollector({ time: 15_000 }).on("collect", (msg) => {
			button.setDisabled(true);
			sentMsg.edit({
				embeds: [embed],
				components: [new MessageActionRow().addComponents(button)],
			});
		});

		message.channel
			.createMessageComponentCollector({
				filter: (i) => button.customId === i.customId,
				time: 15_000,
			})
			.on("collect", async (i) => {
				const embed = new MessageEmbed()
					.setTitle("ModMail Ticket")
					.setDescription(message.author.id)
					.setColor("BLURPLE");

				const starterMsg = await mailChannel.send({
					content: process.env.NODE_ENV === "production" ? "@here" : undefined,
					embeds: [embed],
				});
				const thread = await starterMsg.startThread({
					name: `${message.author.username}-${message.author.discriminator}`,
				});

				if (!webhook) throw new Error("Could not find webhook");
				i.reply("ModMail Started");
				webhook.send({
					threadId: thread.id,
					content: message.content,
					username: message.author.username,
					avatarURL: message.author.avatarURL() || "",
				});
				button.setDisabled(true);
				sentMsg.edit({
					embeds: [embed],
					components: [new MessageActionRow().addComponents(button)],
				});
			})
			.on("end", async () => {
				button.setDisabled(true);
				sentMsg.edit({
					embeds: [embed],
					components: [new MessageActionRow().addComponents(button)],
				});
			});

		return;
	}

	if (
		message.channel.type === "GUILD_PUBLIC_THREAD" &&
		message.channel.parent?.id === MODMAIL_CHANNEL &&
		!message.webhookId &&
		!message.content.startsWith("=")
	) {
		const starter = await message.channel.fetchStarterMessage();
		const user = await message.client.users.fetch(starter.embeds[0]?.description || "");
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
