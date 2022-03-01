/**
 * @file Run Actions on posted messages.Send modmails, autoreact if contains certain triggers, and
 *   autoreply if contains certain triggers.
 */
import { MessageActionRow, MessageButton, MessageEmbed } from "discord.js";

import {
	generateMessage,
	getMemberFromThread,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	WEBHOOK_NAME,
} from "../common/modmail.js";
import escape, { escapeForCodeblock } from "../lib/escape.js";
import generateHash from "../lib/generateHash.js";

const { GUILD_ID = "", NODE_ENV } = process.env;

if (!GUILD_ID) throw new ReferenceError("GUILD_ID is not set in the .env.");

/** @type {import("../types/event").default<"messageCreate">} */
const event = {
	async event(message) {
		const promises = [];

		if (
			!message.content.startsWith("=") &&
			message.channel.type === "DM" &&
			message.author.id !== message.client.user?.id
		) {
			const guild = await message.client.guilds.fetch(GUILD_ID);
			const mailChannel = await guild.channels.fetch(MODMAIL_CHANNEL);

			if (!mailChannel) throw new ReferenceError("Could not find modmail channel");

			if (mailChannel.type !== "GUILD_TEXT")
				throw new TypeError("Modmail channel is not a text channel");

			const webhooks = await mailChannel.fetchWebhooks();
			const webhook =
				webhooks.find((possibleWebhook) => possibleWebhook.name === WEBHOOK_NAME) ||
				(await mailChannel.createWebhook(WEBHOOK_NAME));

			const existingThread = await getThreadFromMember(guild, message.author);

			if (existingThread) {
				promises.push(
					webhook
						.send({
							threadId: existingThread.id,
							...(await generateMessage(message, guild)),
						})
						.then(async () => await message.react("<:yes:940054094272430130>"))
						.catch(async () => await message.react("<:no:940054047854047282>")),
				);
			} else {
				const confirmEmbed = new MessageEmbed()
					.setTitle("Confirmation")
					.setDescription(
						`You are sending this message to the ${escape(
							mailChannel.guild.name,
						)} Server’s mod team. If you are sure you would like to do this, press the button below.`,
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
				const sentMessage = await message.channel.send({
					components: [new MessageActionRow().addComponents(button, cancelButton)],
					embeds: [confirmEmbed],
				});

				message.channel.createMessageCollector({ time: 30_000 }).on("collect", async () => {
					button.setDisabled(true);
					cancelButton.setDisabled(true);
					await sentMessage.edit({
						components: [new MessageActionRow().addComponents(button, cancelButton)],
						embeds: [confirmEmbed],
					});
				});

				message.channel
					.createMessageComponentCollector({
						filter: (buttonInteraction) =>
							[button.customId, cancelButton.customId].includes(
								buttonInteraction.customId,
							) && buttonInteraction.user.id === message.author.id,

						time: 30_000,
					})
					.on("collect", async (buttonInteraction) => {
						const buttonPromises = [];

						switch (buttonInteraction.customId) {
							case button.customId: {
								const openedEmbed = new MessageEmbed()
									.setTitle("Modmail ticket opened")
									.setDescription(`Ticket by ${message.author.toString()}`)
									.setFooter({
										text: "Please note that reactions, replies, edits, and deletes are not supported.",
									})
									.setColor("BLURPLE");

								const starterMessage = await mailChannel.send({
									content: NODE_ENV === "production" ? "@here" : undefined,

									embeds: [openedEmbed],
								});
								const newThread = await starterMessage.startThread({
									name: `${message.author.username} (${message.author.id})`,
								});

								if (!webhook) throw new ReferenceError("Could not find webhook");

								buttonPromises.push(
									buttonInteraction.reply({
										content:
											"<:yes:940054094272430130> Modmail ticket opened. You may send the mod team messages by sending me DMs. I will DM you their messages. Please note that reactions, replies, edits, and deletes are not supported.",
										ephemeral: true,
									}),
									webhook
										.send({
											threadId: newThread.id,
											...(await generateMessage(message, guild)),
										})
										.then(
											async () =>
												await message.react("<:yes:940054094272430130>"),
										)
										.catch(
											async () =>
												await message.react("<:no:940054047854047282>"),
										),
								);
								button.setDisabled(true);

								break;
							}
							case cancelButton.customId: {
								button.setDisabled(true);
								cancelButton.setDisabled(true);

								buttonPromises.push(
									buttonInteraction.reply({
										content: "<:no:940054047854047282> Modmail canceled",
										ephemeral: true,
									}),

									sentMessage.edit({
										components: [
											new MessageActionRow().addComponents(
												button,
												cancelButton,
											),
										],

										embeds: [confirmEmbed],
									}),
								);

								break;
							}
						}

						await Promise.all(buttonPromises);
					})
					.on("end", async () => {
						button.setDisabled(true);
						await sentMessage.edit({
							components: [new MessageActionRow().addComponents(button)],
							embeds: [confirmEmbed],
						});
					});
			}
		}

		if (message.guild !== null && message.guild.id !== GUILD_ID) {
			return await Promise.all(promises);
		}

		if (
			message.channel.type === "GUILD_PUBLIC_THREAD" &&
			message.channel.parent?.id === MODMAIL_CHANNEL &&
			!message.webhookId &&
			!message.content.startsWith("=")
		) {
			const user = await getMemberFromThread(message.channel);

			if (user) {
				const channel =
					user.user.dmChannel ||
					(await user.createDM().catch(async () => {
						await message.react("<:no:940054047854047282>");
					}));

				promises.push(
					channel
						?.send(await generateMessage(message))
						.then(async () => await message.react("<:yes:940054094272430130>"))
						.catch(async () => await message.react("<:no:940054047854047282>")),
				);
			}
		}

		if (
			message.type === "THREAD_CREATED" &&
			message.channel.id === process.env.SUGGESTION_CHANNEL
		) {
			return await message.delete();
		}

		const content = message.content
			.toLowerCase()
			.normalize("NFD")
			.replace(/\p{Diacritic}/gu, "");

		/**
		 * Determines whether the message contains a word.
		 *
		 * @param {string} text - The word to check for.
		 * @param {boolean} [plural] - Whether to account for plurals.
		 *
		 * @returns {boolean} Whether the message contains the word.
		 */
		function includes(text, plural = true) {
			return (
				content.split(/[^a-z0-9]+/gi).includes(text) ||
				(plural &&
					(content.split(/[^a-z0-9]+/gi).includes(`${text}s`) ||
						content.split(/[^a-z0-9]+/gi).includes(`${text}es`)))
			);
		}

		if (includes("dango") || content.includes("🍡")) promises.push(message.react("🍡"));

		if (content === "e" || content === "." || content.includes("<:e_:847428533432090665>"))
			promises.push(message.react("<:e_:939986562937151518>"));

		if (
			content === "potato" ||
			content === "potatoes" ||
			content === "potatos" ||
			(content.includes("🥔") && message.channel.id !== process.env.BOARD_CHANNEL)
		)
			promises.push(message.react("🥔"));

		if (includes("griff") || includes("griffpatch"))
			promises.push(message.react("<:griffpatch:938441399936909362>"));

		if (includes("amongus") || includes("amogus"))
			promises.push(message.react("<:sus:938441549660975136>"));

		if (includes("sus", false)) promises.push(message.react("<:sus_pepe:938548233385414686>"));

		if (includes("appel")) promises.push(message.react("<:appel:938818517535440896>"));

		if (includes("cubot")) promises.push(message.react("<:cubot:939336981601722428>"));

		if (includes("splory")) promises.push(message.react("<:splory:942561415594663966>"));

		if (includes("tera") || content.includes("tewwa"))
			promises.push(message.react("<:tewwa:938486033274785832>"));

		if (
			/gives? ?you ?up/.test(content) ||
			includes("rick") ||
			includes("rickroll") ||
			includes("rickrolled", false) ||
			includes("rickrolling", false) ||
			message.cleanContent.includes("dQw4w9WgXcQ")
		)
			promises.push(message.react("<a:rick:938547171366682624>"));

		if (content.includes("( ^∘^)つ")) promises.push(message.react("<:sxd:939985869421547520>"));

		if (content.includes("scradd bad"))
			promises.push(message.react("<:angery:939337168780943390>"));

		if (content === "no") promises.push(message.react("<:no:940054047854047282>"));

		if (message.mentions.users.has(message.client.user?.id || "") && message.type !== "REPLY")
			promises.push(message.react("👋"));

		if (content.includes("sat on addons")) {
			promises.push(
				message
					.react("<:sa_full1:939336189880713287>")
					.then(async () => await message.react("<:soa_full1:939336229449789510>"))
					.then(async () => await message.react("<:sa_full3:939336281454936095>")),
			);
		}

		// eslint-disable-next-line no-irregular-whitespace -- This is intended.
		const spoilerHack = "||​||".repeat(200);

		if (message.content.includes(spoilerHack)) {
			const array = message.content.split(spoilerHack);

			array.shift();
			promises.push(
				message.reply({
					allowedMentions: { roles: [], users: [] },

					content: `You used the spoiler hack to hide: \`\`\`\n${escapeForCodeblock(
						array.join(spoilerHack),
					)}\n\`\`\``,
				}),
			);
		}

		const firstMention = message.mentions.users.first();

		if (
			/^r!(?:impersonate|mimic|possess|salas|speaks|sudo)\s+<@!?\d+>/iu.test(
				message.content,
			) &&
			firstMention?.id !== message.author.id &&
			!firstMention?.bot &&
			!message.author?.bot &&
			!firstMention?.system
		) {
			const member = await message.guild?.members.fetch(firstMention?.id || "");

			promises.push(
				message.reply({
					content: `Please don’t ping people when using \`r!mimic\` - use their tag instead. Example: \`r!mimic ${escape(
						member?.user.tag || "",
					)}\` instead of \`r!mimic @${escape(
						member?.nickname || member?.user.username || "",
					)}\`. This command had to be disabled in the past because people kept pinging Griffpatch while using it. Please let us keep this on. Thanks!`,
				}),
			);
		}

		if (/^r!(?:idea|sg|suggest(?:ion)?)/diu.test(message.content) && !message.author?.bot) {
			promises.push(
				message.reply({
					content: "`r!suggest` has been removed, please use `/suggestion create`.",
				}),
			);
		}

		await Promise.all(promises);
	},
};
export default event;
