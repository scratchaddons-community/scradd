/**
 * @file Run Actions on posted messages. Send modmails, autoreact if contains certain triggers, and
 *   autoreply if contains certain triggers.
 */
import { MessageEmbed } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import {
	COLORS,
	generateConfirm,
	generateMessage,
	getMemberFromThread,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	UNSUPPORTED,
} from "../common/modmail.js";

import escapeMessage, { escapeForCodeblock } from "../lib/escape.js";
import reactAll from "../lib/reactAll.js";

const { GUILD_ID = "", NODE_ENV, SUGGESTION_CHANNEL, BOARD_CHANNEL } = process.env;

if (!GUILD_ID) throw new ReferenceError("GUILD_ID is not set in the .env.");

/** @type {import("../types/event").default<"messageCreate">} */
const event = {
	async event(message) {
		if (message.flags.has("EPHEMERAL")) return;
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
				webhooks.find(
					(possibleWebhook) => possibleWebhook.name === CONSTANTS.webhookName,
				) ?? (await mailChannel.createWebhook(CONSTANTS.webhookName));
			const existingThread = await getThreadFromMember(guild, message.author);

			if (existingThread) {
				promises.push(
					webhook
						.send({
							threadId: existingThread.id,
							...(await generateMessage(message)),
						})
						.then(async () => await message.react(CONSTANTS.emojis.statuses.yes))
						.catch(async () => await message.react(CONSTANTS.emojis.statuses.no)),
				);
			} else if (
				[
					"DEFAULT",
					"REPLY",
					"APPLICATION_COMMAND",
					"THREAD_STARTER_MESSAGE",
					"CONTEXT_MENU_COMMAND",
				].includes(message.type)
			) {
				let toEdit = message;
				const collector = await generateConfirm(
					{
						display: `the ${escapeMessage(mailChannel.guild.name)} server’s mod team`,
						name: mailChannel.guild.name,
						icon: mailChannel.guild.iconURL() ?? undefined,
						additional:
							"This will ping all online mods, so please do not abuse this if you do not have a genuine reason for contacting us.",
					},
					async (buttonInteraction) => {
						const openedEmbed = new MessageEmbed()
							.setTitle("Modmail ticket opened!")
							.setDescription(`Ticket by ${message.author.toString()}`)
							.setFooter({
								text: UNSUPPORTED,
							})
							.setColor(COLORS.opened);

						const starterMessage = await mailChannel.send({
							allowedMentions: { parse: ["everyone"] },
							content: NODE_ENV === "production" ? "@here" : undefined,

							embeds: [openedEmbed],
						});
						const newThread = await starterMessage.startThread({
							name: `${message.author.username}`,
							autoArchiveDuration: "MAX",
						});

						if (!webhook) throw new ReferenceError("Could not find webhook");

						await Promise.all([
							buttonInteraction.reply({
								content:
									`${CONSTANTS.emojis.statuses.yes} **Modmail ticket opened!** You may send the mod team messages by sending me DMs. I will DM you their messages. ` +
									UNSUPPORTED,

								ephemeral: true,
							}),
							webhook
								.send({
									threadId: newThread.id,
									...(await generateMessage(message)),
								})
								.then(
									async () => await message.react(CONSTANTS.emojis.statuses.yes),
								)
								.catch(
									async () => await message.react(CONSTANTS.emojis.statuses.no),
								),
						]);
					},
					async (options) => {
						toEdit = await message.reply(options);
						return toEdit;
					},
					(options) => toEdit.edit(options),
				);
				message.channel.createMessageCollector({ time: 30_000 }).on("collect", async () => {
					collector?.stop();
				});
			}
		}

		if (message.guild !== null && message.guild.id !== GUILD_ID)
			return await Promise.all(promises);

		if (
			message.channel.type === "GUILD_PUBLIC_THREAD" &&
			message.channel.parent?.id === MODMAIL_CHANNEL &&
			!message.content.startsWith("=") &&
			(message.webhookId && message.author.id !== message.client.user?.id
				? (await message.fetchWebhook()).owner?.id !== message.client.user?.id
				: true) &&
			message.interaction?.commandName !== "modmail"
		) {
			const member = await getMemberFromThread(message.channel);

			if (member) {
				const channel =
					member.user.dmChannel ??
					(await member.createDM().catch(async () => {
						await message.react(CONSTANTS.emojis.statuses.no);
					}));
				const messageToSend = await generateMessage(message);

				messageToSend.content =
					message.author.toString() +
					":" +
					(messageToSend.content ? " " + messageToSend.content : "");

				promises.push(
					channel
						?.send(messageToSend)
						.then(async () => await message.react(CONSTANTS.emojis.statuses.yes))
						.catch(async () => await message.react(CONSTANTS.emojis.statuses.no)),
				);
			}
		}

		if (
			message.type === "THREAD_CREATED" &&
			[process.env.BUGS_CHANNEL, SUGGESTION_CHANNEL].includes(message.channel.id)
		)
			return await message.delete();

		// Autoactions start here. Return early in some channels.

		if (
			[
				SUGGESTION_CHANNEL,
				process.env.BUGS_CHANNEL,
				BOARD_CHANNEL,
				process.env.ERROR_CHANNEL,
			].includes(message.channel.id)
		)
			return await Promise.all(promises);

		const content = message.content
			.toLowerCase()
			.normalize("NFD")
			.replace(
				/[\p{Diacritic}\u00AD\u034F\u061C\u070F\u17B4\u17B5\u180E\u200A-\u200F\u2060-\u2064\u206A-\u206F𝅳�\uFEFF\uFFA0]/gu,
				"",
			);

		/**
		 * Determines whether the message contains a word.
		 *
		 * @param {string} text - The word to check for.
		 * @param {boolean} [plural] - Whether to account for plurals.
		 *
		 * @returns {boolean} Whether the message contains the word.
		 */
		function includes(text, plural = true) {
			const split = content.split(/[^\da-z]+/i);
			return (
				split.includes(text) ||
				(plural && (split.includes(`${text}s`) || split.includes(`${text}es`)))
			);
		}

		if (includes("dango") || content.includes("🍡")) promises.push(message.react("🍡"));

		if (content === "e" || content === "." || content.includes("<:e_:847428533432090665>"))
			promises.push(message.react(CONSTANTS.emojis.autoreact.e));

		if (
			content === "potato" ||
			content === "potatoes" ||
			content === "potatos" ||
			(content.includes("🥔") && message.channel.id !== BOARD_CHANNEL)
		)
			promises.push(message.react("🥔"));

		if (includes("griff") || includes("griffpatch"))
			promises.push(message.react(CONSTANTS.emojis.autoreact.griffpatch));

		if (includes("amongus") || includes("amogus"))
			promises.push(message.react(CONSTANTS.emojis.autoreact.amongus));

		if (includes("sus", false)) promises.push(message.react(CONSTANTS.emojis.autoreact.sus));

		if (includes("appel")) promises.push(message.react(CONSTANTS.emojis.autoreact.appel));

		if (includes("cubot")) promises.push(message.react(CONSTANTS.emojis.autoreact.cubot));

		if (includes("splory")) promises.push(message.react(CONSTANTS.emojis.autoreact.splory));

		if (includes("tera") || content.includes("tewwa"))
			promises.push(message.react(CONSTANTS.emojis.autoreact.tera));

		if (
			/gives? ?you ?up/.test(content) ||
			includes("rick") ||
			includes("rickroll") ||
			includes("rickrolled", false) ||
			includes("rickrolling", false) ||
			message.content.includes("dQw4w9WgXcQ")
		)
			promises.push(message.react(CONSTANTS.emojis.autoreact.rick));

		if (message.content.includes("( ^∘^)つ"))
			promises.push(message.react(CONSTANTS.emojis.autoreact.sxd));

		if (content.includes("scradd bad"))
			promises.push(message.react(CONSTANTS.emojis.autoreact.angery));

		if (message.content === "NO") promises.push(message.react(CONSTANTS.emojis.autoreact.nope));

		if (message.mentions.users.has(message.client.user?.id ?? "") && message.type !== "REPLY")
			promises.push(message.react("👋"));

		if (content.includes("sat on addons")) {
			promises.push(reactAll(message, CONSTANTS.emojis.autoreact.soa));
		}

		// eslint-disable-next-line no-irregular-whitespace -- This is intended.
		const spoilerHack = "||​||".repeat(200);

		if (message.content.includes(spoilerHack)) {
			const array = message.content.split(spoilerHack);

			array.shift();
			promises.push(
				message.reply({
					allowedMentions: { roles: [], users: [] },

					content:
						`You used the spoiler hack to hide: \`\`\`\n` +
						`${escapeForCodeblock(array.join(spoilerHack))}\n` +
						`\`\`\``,
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
