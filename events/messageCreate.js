import { GuildMember, MessageEmbed, Util } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";

import {
	COLORS,
	generateConfirm,
	generateMessage,
	getMemberFromThread,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	openModmail,
	UNSUPPORTED,
} from "../common/modmail.js";

import escapeMessage, { stripMarkdown } from "../lib/escape.js";
import reactAll from "../lib/reactAll.js";

const { GUILD_ID = "", SUGGESTION_CHANNEL, BOARD_CHANNEL } = process.env;

if (!GUILD_ID) throw new ReferenceError("GUILD_ID is not set in the .env.");

/** @type {import("../types/event").default<"messageCreate">} */
const event = {
	async event(message) {
		if (message.flags.has("EPHEMERAL") || message.type === "THREAD_STARTER_MESSAGE") return;
		const promises = [];

		let reactions = 0;

		if (message.channel.type === "DM" && message.author.id !== message.client.user?.id) {
			const guild = await message.client.guilds.fetch(GUILD_ID);
			const mailChannel = await guild.channels.fetch(MODMAIL_CHANNEL);

			if (!mailChannel) throw new ReferenceError("Could not find modmail channel");

			if (mailChannel.type !== "GUILD_TEXT")
				throw new TypeError("Modmail channel is not a text channel");

			const webhooks = await mailChannel.fetchWebhooks();
			const webhook =
				webhooks.find((possibleWebhook) => !!possibleWebhook.token) ??
				(await mailChannel.createWebhook(CONSTANTS.webhookName));
			const existingThread = await getThreadFromMember(
				message.interaction?.user || message.author,
				guild,
			);

			if (existingThread) {
				reactions++;
				promises.push(
					webhook
						.send({
							threadId: existingThread.id,
							...(await generateMessage(message)),
						})
						.then(async () => await message.react(CONSTANTS.emojis.statuses.yes))
						.catch(async () => await message.react(CONSTANTS.emojis.statuses.no)),
				);
			} else if (["DEFAULT", "REPLY", "THREAD_STARTER_MESSAGE"].includes(message.type)) {
				const collector = await generateConfirm(
					new MessageEmbed()
						.setTitle("Confirmation")
						.setDescription(
							`Are you sure you want to send this message to **the ${escapeMessage(
								mailChannel.guild.name,
							)} server’s mod team**? This will ping all online mods, so please do not abuse this if you do not have a genuine reason for contacting us.`,
						)
						.setColor(COLORS.confirm)
						.setAuthor({
							iconURL: mailChannel.guild.iconURL() ?? undefined,
							name: mailChannel.guild.name,
						}),
					async (buttonInteraction) => {
						const openedEmbed = new MessageEmbed()
							.setTitle("Modmail ticket opened!")
							.setDescription(`Ticket by ${message.author.toString()}`)
							.setFooter({
								text:
									UNSUPPORTED +
									CONSTANTS.footerSeperator +
									"Messages starting with an equals sign (=) are ignored.",
							})
							.setColor(COLORS.opened);

						const newThread = await openModmail(
							mailChannel,
							openedEmbed,
							message.author.username,
							true,
						);

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
						return await message.reply(options);
					},
				);
				message.channel.createMessageCollector({ time: 30_000 }).on("collect", async () => {
					collector?.stop();
				});
			}
		}

		if (message.guild !== null && message.guild.id !== GUILD_ID) {
			await Promise.all(promises);
			return;
		}

		if (
			message.channel.type === "GUILD_PUBLIC_THREAD" &&
			message.channel.parent?.id === MODMAIL_CHANNEL &&
			!message.content.startsWith("=") &&
			(message.webhookId && message.author.id !== message.client.user?.id
				? (await message.fetchWebhook()).owner?.id !== message.client.user?.id
				: true) &&
			message.interaction?.commandName !== "modmail close"
		) {
			const member = await getMemberFromThread(message.channel);

			if (member instanceof GuildMember) {
				const messageToSend = await generateMessage(message);

				messageToSend.content =
					message.author.toString() +
					":" +
					(messageToSend.content ? " " + messageToSend.content : "");

				reactions++;

				promises.push(
					member
						?.send(messageToSend)
						.then(async () => await message.react(CONSTANTS.emojis.statuses.yes))
						.catch(async () => await message.react(CONSTANTS.emojis.statuses.no)),
				);
			}
		}

		if (process.env.LOGS_CHANNEL !== message.channel.id) {
			// eslint-disable-next-line no-irregular-whitespace -- This is intended.
			const spoilerHack = "||​||".repeat(200);

			if (message.content.includes(spoilerHack)) {
				const array = message.cleanContent.split(spoilerHack);

				array.shift();
				promises.push(
					message.reply({
						allowedMentions: { users: [] },

						content:
							`You used the spoiler hack to hide: \`\`\`\n` +
							`${Util.cleanCodeBlockContent(array.join(spoilerHack))}\n` +
							`\`\`\``,
					}),
				);
			}
		}

		if (
			message.type === "THREAD_CREATED" &&
			[process.env.BUGS_CHANNEL, SUGGESTION_CHANNEL].includes(message.channel.id) &&
			message.reference
		) {
			await Promise.all([...promises, message.delete()]);
			return;
		}

		// Autoreactions start here. Don't react to bots.

		if (
			message.interaction ||
			[
				SUGGESTION_CHANNEL,
				process.env.BUGS_CHANNEL,
				BOARD_CHANNEL,
				process.env.LOGS_CHANNEL,
			].includes(message.channel.id)
		) {
			await Promise.all(promises);
			return;
		}

		const content = stripMarkdown(
			message.content
				.toLowerCase()
				.normalize("NFD")
				.replace(
					/[\p{Diacritic}\u00AD\u034F\u061C\u070F\u17B4\u17B5\u180E\u200A-\u200F\u2060-\u2064\u206A-\u206F𝅳�\uFEFF\uFFA0]/gu,
					"",
				)
				.replace(/<.+?>/, ""),
		);

		/**
		 * Determines whether the message contains a word.
		 *
		 * @param {string | RegExp} text - The word to check for.
		 *
		 * @returns {boolean} Whether the message contains the word.
		 */
		function includes(text, { full = false, plural = true } = {}) {
			return new RegExp(
				(full ? "^" : "\\b") +
					(typeof text === "string" ? text : text.source) +
					(plural ? "(e?s)?" : "") +
					(full ? "$" : "\\b"),
				"i",
			).test(content);
		}

		/**
		 * @param {import("discord.js").EmojiIdentifierResolvable} emoji
		 *
		 * @returns {Promise<void | import("discord.js").MessageReaction> | void}
		 */
		function react(emoji) {
			if (reactions > 2) return;
			reactions++;
			const promise = message.react(emoji).catch(console.error);
			promises.push(promise);
			return promise;
		}

		if (includes("dango") || content.includes("🍡")) react("🍡");

		if (includes(/av[ao]cado/) || content.includes("🥑")) react("🥑");

		if (["e", "ae", "iei", "a", "."].includes(content) || content.includes("æ"))
			react(CONSTANTS.emojis.autoreact.e);

		if (includes("quack") || includes("duck")) react("🦆");

		if (includes("appel")) react(CONSTANTS.emojis.autoreact.appel);

		if (includes(/griff(?:patch)?y?'?/)) react(CONSTANTS.emojis.autoreact.griffpatch);

		if (includes("cubot", { plural: false })) react(CONSTANTS.emojis.autoreact.cubot);
		if (includes("bob", { plural: false })) react(CONSTANTS.emojis.autoreact.bob);

		if (message.content.includes("( ^∘^)つ")) react(CONSTANTS.emojis.autoreact.sxd);

		if (/\bte(?:r|w)+a|(👉|:point_right:) ?(👈|:point_left:)\b/.test(message.content))
			react(CONSTANTS.emojis.autoreact.tera);

		if (includes("on addon")) {
			if (reactions < 2) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.soa));
			}
		}

		if (includes("snake")) {
			if (reactions < 2) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.snakes));
			}
		}

		if (includes("sus", { plural: false })) react(CONSTANTS.emojis.autoreact.sus);

		if (
			includes(/gives? ?you ?up/i, { plural: false }) ||
			content.includes("rickroll") ||
			content.includes("dqw4w9wgxcq")
		)
			react(CONSTANTS.emojis.autoreact.rick);

		if (/^(NO+)+|\b([Nn][oO]{2,})+\b/.test(message.content))
			react(CONSTANTS.emojis.autoreact.nope);

		if (
			message.mentions.users.has(this.user?.id ?? "") &&
			message.mentions.repliedUser?.id !== (this.user?.id ?? "")
		)
			react("👋");

		await Promise.all(promises);
	},
};

export default event;
