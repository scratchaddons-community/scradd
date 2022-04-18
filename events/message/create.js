/**
 * @file Run Actions on posted messages. Send modmails, autoreact if contains certain triggers, and
 *   autoreply if contains certain triggers.
 */
import { GuildMember, Util } from "discord.js";
import { Embed } from "@discordjs/builders";
import CONSTANTS from "../../common/CONSTANTS.js";
import { badWordsAllowed, censorMessage, warn } from "../../common/mod.js";

import {
	COLORS,
	generateConfirm,
	generateMessage,
	getMemberFromThread,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	UNSUPPORTED,
} from "../../common/modmail.js";

import escapeMessage, { strip } from "../../lib/escape.js";
import reactAll from "../../lib/reactAll.js";

const { GUILD_ID = "", NODE_ENV, SUGGESTION_CHANNEL, BOARD_CHANNEL } = process.env;

if (!GUILD_ID) throw new ReferenceError("GUILD_ID is not set in the .env.");

/** @type {import("../../types/event").default<"messageCreate">} */
const event = {
	async event(message) {
		if (message.flags.has("EPHEMERAL") || message.type === "THREAD_STARTER_MESSAGE") return;
		const promises = [];

		let reactions = 0;

		if (
			!message.content.startsWith("=") &&
			message.channel.type === "DM" &&
			(message.author.id !== message.client.user?.id || message.interaction)
		) {
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
						.send({ threadId: existingThread.id, ...(await generateMessage(message)) })
						.then(async () => await message.react(CONSTANTS.emojis.statuses.yes))
						.catch(async (error) => {
							console.error(error);
							return await message.react(CONSTANTS.emojis.statuses.no);
						}),
				);
			} else if (["DEFAULT", "REPLY", "THREAD_STARTER_MESSAGE"].includes(message.type)) {
				let toEdit = message;
				const collector = await generateConfirm(
					new Embed()
						.setTitle("Confirmation")
						.setDescription(
							`Are you sure you want to send this message to **the ${escapeMessage(
								mailChannel.guild.name,
							)} server’s mod team**?This will ping all online mods, so please do not abuse this if you do not have a genuine reason for contacting us.`,
						)
						.setColor(COLORS.confirm)
						.setAuthor({
							iconURL: mailChannel.guild.iconURL() ?? undefined,
							name: mailChannel.guild.name,
						}),
					async (buttonInteraction) => {
						const openedEmbed = new Embed()
							.setTitle("Modmail ticket opened!")
							.setDescription(`Ticket by ${message.author.toString()}`)
							.setFooter({ text: UNSUPPORTED })
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
								.catch(async (error) => {
									console.error(error);
									return await message.react(CONSTANTS.emojis.statuses.no);
								}),
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

		if (message.guild?.id !== process.env.GUILD_ID) return;

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
						.catch(async (error) => {
							console.error(error);
							return await message.react(CONSTANTS.emojis.statuses.no);
						}),
				);
			}
		}

		const mentions = (
			process.env.NODE_ENV === "production"
				? message.mentions.users.filter(
						(user) => user.id !== message.author.id && !user.bot,
				  )
				: message.mentions.users
		).size;

		if (mentions > 4 && message.member) {
			promises.push(
				warn(message.member, "Please don’t ping so many people!", Math.round(mentions / 5)),
				message.reply({
					content: CONSTANTS.emojis.statuses.no + " Please don’t ping so many people!",
				}),
			);
		}

		if (
			/^r!(?:idea|sg|suggest(?:ion)?)(?: |$)/diu.test(message.content) &&
			!message.author?.bot
		) {
			promises.push(
				message.reply({
					content: "`r!suggest` has been removed, please use `/suggestion create`.",
				}),
			);
		}

		if (!badWordsAllowed(message.channel)) {
			if (await censorMessage(message)) return;
		}

		if (process.env.LOG_CHANNEL !== message.channel.id) {
			// eslint-disable-next-line no-irregular-whitespace -- This is intended.
			const spoilerHack = "||​||".repeat(200);

			if (message.content.includes(spoilerHack)) {
				const array = message.content.split(spoilerHack);

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

		// Autoreactions start here. Return early in some channels.

		if (
			[
				SUGGESTION_CHANNEL,
				process.env.BUGS_CHANNEL,
				BOARD_CHANNEL,
				process.env.LOG_CHANNEL,
			].includes(message.channel.id)
		) {
			await Promise.all(promises);
			return;
		}

		const content = strip(
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
			const promise = message.react(emoji).catch((error) => {
				console.error(error);
			});
			promises.push(promise);
			return promise;
		}

		if (includes("dango") || content.includes("🍡")) react("🍡");

		if (includes(/av[ao]cado/) || content.includes("🥑")) react("🥑");

		if (
			content === "e" ||
			(content === "." && message.author.id === "761276793666797589") ||
			content.includes("<:e_:847428533432090665>")
		)
			react(CONSTANTS.emojis.autoreact.e);

		if (includes("quack") || includes("duck") || content.includes("🦆")) react("🦆");

		if (includes("appel")) react(CONSTANTS.emojis.autoreact.appel);

		if (includes(/griff(?:patch)?y?'?/)) react(CONSTANTS.emojis.autoreact.griffpatch);

		if (includes("cubot")) react(CONSTANTS.emojis.autoreact.cubot);

		if (message.content.includes("( ^∘^)つ")) react(CONSTANTS.emojis.autoreact.sxd);

		if (includes(/te(?:r|w)+a/)) react(CONSTANTS.emojis.autoreact.tera);

		if (includes("sat on addon")) {
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

		if (includes(/amon?g ?us/, { plural: false })) react(CONSTANTS.emojis.autoreact.amongus);

		if (includes("sus", { plural: false })) react(CONSTANTS.emojis.autoreact.sus);

		if (
			/gives? ?you ?up/.test(content) ||
			includes("rickroll") ||
			includes(/(?:rick(roll(?:ed|ing))?|dqw4w9wgxcq)/i, { plural: false })
		)
			react(CONSTANTS.emojis.autoreact.rick);

		if (/\b(NO+)+\b/.test(message.content)) react(CONSTANTS.emojis.autoreact.nope);

		if (
			message.mentions.users.has(message.client.user?.id ?? "") &&
			message.mentions.repliedUser?.id !== (message.client.user?.id ?? "")
		)
			react("👋");

		await Promise.all(promises);
	},
};

export default event;
