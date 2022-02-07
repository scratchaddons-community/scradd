import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";
import generateHash from "../lib/generateHash.js";
import dotenv from "dotenv";
import {
	generateMessage,
	getMemberFromThread,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	WH_NAME,
} from "../common/modmail.js";

dotenv.config();
const { GUILD_ID } = process.env;
if (!GUILD_ID) throw new Error("GUILD_ID is not set in the .env.");

/** @param {import("discord.js").Message} message */
export default async (message) => {
	if (message.author.id === message.client.user?.id) return;

	if (message.channel.type === "DM" && ["DEFAULT", "REPLY"].includes(message.type)) {
		const guild = await message.client.guilds.fetch(GUILD_ID);
		const mailChannel = await guild.channels.fetch(MODMAIL_CHANNEL);
		if (!mailChannel) throw new Error("Could not find modmail channel");
		if (mailChannel.type !== "GUILD_TEXT")
			throw new Error("Modmail channel is not a text channel");
		const webhooks = await mailChannel.fetchWebhooks();
		const webhook =
			webhooks.find((wh) => wh.name === WH_NAME) ||
			(await mailChannel.createWebhook(WH_NAME));

		const thread = await getThreadFromMember(guild, message.author);
		if (thread) {
			webhook.send({ threadId: thread.id, ...generateMessage(message) });
		} else {
			const embed = new MessageEmbed()
				.setTitle("Confimation")
				.setDescription(
					"You are sending this message to the " +
						mailChannel.guild.name +
						" Server's mod team. If you are sure you would like to do this, press the button below.",
				)
				.setColor("BLURPLE");
			const button = new MessageButton()
				.setLabel("Confirm")
				.setStyle("PRIMARY")
				.setCustomId(generateHash("confirm"));
			const cancelButton = new MessageButton()
				.setLabel("Cancel")
				.setCustomId(generateHash("cancel"))
				.setStyle("SECONDARY");
			const sentMsg = await message.channel.send({
				embeds: [embed],
				components: [new MessageActionRow().addComponents(button, cancelButton)],
			});

			message.channel.createMessageCollector({ time: 15_000 }).on("collect", () => {
				button.setDisabled(true);
				cancelButton.setDisabled(true);
				sentMsg.edit({
					embeds: [embed],
					components: [new MessageActionRow().addComponents(button, cancelButton)],
				});
			});

			message.channel
				.createMessageComponentCollector({
					filter: (i) =>
						[button.customId, cancelButton.customId].includes(i.customId) &&
						i.user.id === message.author.id,
					time: 15_000,
				})
				.on("collect", async (i) => {
					switch (i.customId) {
						case button.customId: {
							const embed = new MessageEmbed()
								.setTitle("Modmail ticket opened")
								.setDescription("Ticket by " + message.author.toString())
								.setColor("BLURPLE");

							const starterMsg = await mailChannel.send({
								content:
									process.env.NODE_ENV === "production" ? "@here" : undefined,
								embeds: [embed],
							});
							const thread = await starterMsg.startThread({
								name: `${message.author.username} (${message.author.id})`,
							});

							if (!webhook) throw new Error("Could not find webhook");
							i.reply({
								content: "<:yes:940054094272430130> Modmail ticket opened",
								ephemeral: true,
							});
							webhook.send({ threadId: thread.id, ...generateMessage(message) });
							button.setDisabled(true);
							break;
						}
						case cancelButton.customId: {
							button.setDisabled(true);
							cancelButton.setDisabled(true);
							i.reply({
								content: "<:no:940054047854047282> Modmail canceled",
								ephemeral: true,
							});

							sentMsg.edit({
								embeds: [embed],
								components: [
									new MessageActionRow().addComponents(button, cancelButton),
								],
							});
							break;
						}
					}
				})
				.on("end", async () => {
					button.setDisabled(true);
					sentMsg.edit({
						embeds: [embed],
						components: [new MessageActionRow().addComponents(button)],
					});
				});
		}
	}

	if (message.author.bot || message.guild?.id !== process.env.GUILD_ID) return;

	if (
		message.channel.type === "GUILD_PUBLIC_THREAD" &&
		message.channel.parent?.id === MODMAIL_CHANNEL &&
		!message.webhookId &&
		!message.content.startsWith("=") &&
		["DEFAULT", "REPLY"].includes(message.type) &&
		message.guild
	) {
		const user = await getMemberFromThread(message.guild, message.channel);
		if (!user) return;
		const channel = await user.createDM().catch(() => {
			message.reply({
				content: "<:no:940054047854047282> Could not DM user. Ask them to open their DMs.",
			});
		});
		channel?.send(generateMessage(message));
		return;
	}

	if (message.content.startsWith("r!suggest"))
		message.reply({
			content: "`r!suggest` has been removed, please use `/suggestion create`.",
		});

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
	if (content === "e") message.react("<:e_:939986562937151518>");
	if (content == "potato" || content == "potatoes" || content === "🥔") message.react("🥔");
	if (includes("griff", false) || includes("griffpatch", false))
		message.react("<:griffpatch:938441399936909362>");
	if (includes("amongus", false)) message.react("<:sus:938441549660975136>");
	if (includes("sus", false)) message.react("<:sus_pepe:938548233385414686>");
	if (includes("appel")) message.react("<:appel:938818517535440896>");
	if (includes("cubot")) message.react("<:cubot:939336981601722428>");
	if (includes("tera")) message.react("<:tewwa:938486033274785832>");
	if (content.match(/gives?( you)? up/)) message.react("<a:rick:938547171366682624>");
	if (content.includes("( ^∘^)つ")) message.react("<:scratchxdiscord:939985869421547520>");
	if (content.includes("scradd bad")) message.react("<:angery:939337168780943390>");
	if (content.includes("sat on addons"))
		message
			.react("<:sa_full1:939336189880713287>")
			.then(() => message.react("<:soa_full1:939336229449789510>"))
			.then(() => message.react("<:sa_full3:939336281454936095>"));
	if (content.match(/^r!(mimic|possess|sudo|speakas|sayas|impersonate)\s+<@!?\d+>/iu)) {
		const member = await message.guild?.members.fetch(message.mentions.users.first()?.id || "");
		message.reply({
			content: `Please don't ping people when using \`r!mimic\` - use their tag instead. Example: \`r!mimic ${
				member?.user.tag
			}\` instead of \`r!mimic @${
				member?.nickname || member?.user.username
			}\`. This command had to be disabled in the past because people kept pinging Griffpatch while using it. Please let us keep this on. Thanks!`,
		});
	}

	const spoilerHack =
		"||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||||​||";
	if (content.includes(spoilerHack)) {
		const arr = message.cleanContent.split(spoilerHack);
		arr.shift();
		message.reply({
			content: "You used the spoiler hack to hide: ```\n" + arr.join(spoilerHack) + "\n```",
		});
	}
};
