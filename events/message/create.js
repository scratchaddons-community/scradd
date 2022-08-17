import {
	GuildMember,
	cleanCodeBlockContent,
	EmbedBuilder,
	MessageType,
	ChannelType,
} from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import warn from "../../common/moderation/warns.js";
import { automodMessage } from "../../common/moderation/automod.js";

import {
	COLORS,
	generateConfirm,
	generateMessage,
	generateReactionFunctions,
	getMemberFromThread,
	getThreadFromMember,
	MODMAIL_CHANNEL,
	openModmail,
	UNSUPPORTED,
} from "../../common/modmail.js";

import { escapeMessage, stripMarkdown } from "../../lib/markdown.js";
import { reactAll } from "../../lib/message.js";
import { giveXp, NORMAL_XP_PER_MESSAGE } from "../../common/xp.js";
import { normalize } from "../../lib/text.js";

const { GUILD_ID, SUGGESTION_CHANNEL, BOARD_CHANNEL } = process.env;

if (!GUILD_ID) throw new ReferenceError("GUILD_ID isn’t set in the .env");

/** @type {{ [key: string]: import("discord.js").Message[] }} */
const latestMessages = {};

/** @type {import("../../types/event").default<"messageCreate">} */
const event = {
	async event(message) {
		if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage)
			return;
		const promises = [];

		let reactions = 0;

		if (
			message.channel.isDMBased() &&
			(message.author.id !== this.user.id || message.interaction)
		) {
			const guild = await this.guilds.fetch(GUILD_ID);
			const mailChannel = await guild.channels.fetch(MODMAIL_CHANNEL);

			if (!mailChannel) throw new ReferenceError("Could not find modmail channel");

			if (mailChannel.type !== ChannelType.GuildText)
				throw new TypeError("Modmail channel isn’t a text channel");

			const webhooks = await mailChannel.fetchWebhooks();
			const webhook =
				webhooks.find(
					(possibleWebhook) => possibleWebhook.applicationId === this.application.id,
				) ?? (await mailChannel.createWebhook({ name: CONSTANTS.webhookName }));
			const existingThread = await getThreadFromMember(
				message.interaction?.user || message.author,
				guild,
			);

			if (existingThread) {
				reactions++;
				promises.push(
					webhook
						.send({ threadId: existingThread.id, ...(await generateMessage(message)) })
						.then(...generateReactionFunctions(message)),
				);
			} else if (
				[MessageType.Default, MessageType.Reply, MessageType.ThreadStarterMessage].includes(
					message.type,
				)
			) {
				let toEdit = message;
				const collector = await generateConfirm(
					new EmbedBuilder()
						.setTitle("Confirmation")
						.setDescription(
							`Are you sure you want to send this message to **the ${escapeMessage(
								mailChannel.guild.name,
							)} server’s mod team**? This will ping all online mods, so please don’t abuse this if you don’t have a genuine reason for contacting us.`,
						)
						.setColor(COLORS.confirm)
						.setAuthor({
							iconURL: mailChannel.guild.iconURL() ?? undefined,
							name: mailChannel.guild.name,
						}),
					async (buttonInteraction) => {
						const openedEmbed = new EmbedBuilder()
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
								.then(...generateReactionFunctions(message)),
						]);
					},
					async (options) => {
						toEdit = await message.reply(options);
						return toEdit;
					},
					(options) => toEdit.edit(options),
				);
				message.channel
					.createMessageCollector({ time: CONSTANTS.collectorTime })
					.on("collect", async () => {
						collector?.stop();
					});
			}
		}

		if (message.guild !== null && message.guild.id !== GUILD_ID) {
			await Promise.all(promises);
			return;
		}

		if (
			message.channel.type === ChannelType.GuildPublicThread &&
			message.channel.parent?.id === MODMAIL_CHANNEL &&
			!message.content.startsWith("=") &&
			(message.webhookId && message.author.id !== this.user?.id
				? (await message.fetchWebhook()).owner?.id !== this.user?.id
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
					member?.send(messageToSend).then(...generateReactionFunctions(message)),
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

		if (
			mentions > 4 &&
			message.member &&
			!message.member.roles.resolve(process.env.MODERATOR_ROLE || "")
		) {
			promises.push(
				warn(
					message.member,
					`Please don’t ping so many people!`,
					Math.round(mentions / 5),
					message.content,
				),
				message.reply(CONSTANTS.emojis.statuses.no + " Please don’t ping so many people!"),
			);
		}

		if (await automodMessage(message)) {
			await Promise.all(promises);
			return;
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
							`${cleanCodeBlockContent(array.join(spoilerHack))}\n` +
							`\`\`\``,
					}),
				);
			}
		}

		// XP
		if (!message.author.bot || message.interaction) {
			const lastInChannel = (latestMessages[message.channel.id] ||=
				await message.channel.messages
					.fetch({ limit: NORMAL_XP_PER_MESSAGE, before: message.id })
					.then((messages) => messages.toJSON()));
			const spam = lastInChannel.findIndex((foundMessage) => {
				return ![message.author.id, message.interaction?.user.id || ""].some((user) =>
					[foundMessage.author.id, foundMessage.interaction?.user.id].includes(user),
				);
			});
			const newChannel = lastInChannel.length !== NORMAL_XP_PER_MESSAGE;
			if (!newChannel) lastInChannel.pop();
			lastInChannel.unshift(message);
			const bot =
				1 + +(!!message.interaction || /^(([crm]!|!d)\s*|=)\w+/.test(message.content));

			await giveXp(
				message.interaction?.user || message.author,
				spam === -1 && !newChannel
					? 1
					: Math.max(
							1,
							Math.round(
								(NORMAL_XP_PER_MESSAGE -
									(newChannel ? lastInChannel.length - 1 : spam)) /
									bot /
									(1 +
										+![
											MessageType.Default,
											MessageType.GuildBoost,
											MessageType.GuildBoostTier1,
											MessageType.GuildBoostTier2,
											MessageType.GuildBoostTier3,
											MessageType.Reply,
											MessageType.ChatInputCommand,
											MessageType.ContextMenuCommand,
										].includes(message.type)),
							),
					  ),
			);
		}

		// Autoreactions start here. Don’t react to bots.

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

		const content = stripMarkdown(normalize(message.content).replace(/<.+?>/, ""));

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

		const REACTION_CAP = 2;

		/**
		 * @param {import("discord.js").EmojiIdentifierResolvable} emoji
		 *
		 * @returns {Promise<void | import("discord.js").MessageReaction> | void}
		 */
		function react(emoji) {
			if (reactions > REACTION_CAP) return;
			reactions++;
			const promise = message.react(emoji).catch(console.error);
			promises.push(promise);
			return promise;
		}

		if (includes("dango")) react("🍡");
		if (includes(/av[ao]cado/)) react("🥑");

		if (["e", "ae", "iei", "a", "."].includes(content) || content.includes("æ"))
			react(CONSTANTS.emojis.autoreact.e);

		if (content.includes("quack") || includes("duck")) react("🦆");
		if (includes("appel")) react(CONSTANTS.emojis.autoreact.appel);
		if (includes(/griff(?:patch)?y?/)) react(CONSTANTS.emojis.autoreact.griffpatch);
		if (includes("cubot", { plural: false })) react(CONSTANTS.emojis.autoreact.cubot);
		if (includes("bob", { plural: false })) react(CONSTANTS.emojis.autoreact.bob);
		if (message.content.includes("( ^∘^)つ")) react(CONSTANTS.emojis.autoreact.sxd);

		if (/\bte(?:r|w)+a|(👉|:point_right:) ?(👈|:point_left:)\b/.test(message.content))
			react(CONSTANTS.emojis.autoreact.tera);

		if (includes("on addon")) {
			if (reactions < REACTION_CAP) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.soa));
			}
		}

		if (includes("snake") || includes("snek")) {
			if (reactions < REACTION_CAP) {
				reactions = reactions + 3;
				promises.push(reactAll(message, CONSTANTS.emojis.autoreact.snakes));
			}
		}

		if (includes("sus", { plural: false })) react(CONSTANTS.emojis.autoreact.sus);

		if (
			includes(/gives? ?you ?up/i, { plural: false }) ||
			content.includes("rickroll") ||
			content.includes("astley") ||
			content.includes("dqw4w9wgxcq")
		)
			react(CONSTANTS.emojis.autoreact.rick);

		if (/\b((NO+)|(n|N)o{2,})+\b/.test(message.content)) react(CONSTANTS.emojis.autoreact.nope);

		if (
			message.mentions.has(this.user?.id ?? "", {
				ignoreEveryone: true,
				ignoreRoles: true,
				ignoreRepliedUser: true,
			})
		)
			react("👋");

		await Promise.all(promises);
	},
};

export default event;
