import { cleanCodeBlockContent, EmbedBuilder, MessageType, ChannelType } from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import warn from "../../common/moderation/warns.js";
import { automodMessage } from "../../common/moderation/automod.js";

import {
	MODMAIL_COLORS,
	generateModmailConfirm,
	generateModmailMessage,
	generateReactionFunctions,
	getUserFromModmail,
	getThreadFromMember,
	openModmail,
	MODMAIL_UNSUPPORTED,
} from "../../common/modmail.js";

import { escapeMessage, stripMarkdown } from "../../lib/markdown.js";
import { getBaseChannel, reactAll } from "../../lib/discord.js";
import giveXp, { NORMAL_XP_PER_MESSAGE } from "../../common/xp.js";
import { normalize, truncateText } from "../../lib/text.js";
import client, { guild } from "../../client.js";
import { asyncFilter } from "../../lib/promises.js";
import { userSettingsDatabase } from "../../commands/settings.js";

const { GUILD_ID } = process.env;

/** @type {{ [key: import("discord.js").Snowflake]: import("discord.js").Message[] }} */
const latestMessages = {};

/** @type {import("../../common/types/event").default<"messageCreate">} */
export default async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;
	const promises = [];

	let reactions = 0;

	if (
		message.channel.isDMBased() &&
		(message.author.id !== client.user.id || message.interaction) &&
		CONSTANTS.channels.modmail
	) {
		const webhooks = await CONSTANTS.channels.modmail.fetchWebhooks();
		const webhook =
			webhooks.find(
				(possibleWebhook) => possibleWebhook.applicationId === client.application.id,
			) ?? (await CONSTANTS.channels.modmail.createWebhook({ name: CONSTANTS.webhookName }));
		const existingThread = await getThreadFromMember(
			message.interaction?.user || message.author,
		);

		if (existingThread) {
			reactions++;
			promises.push(
				webhook
					.send({
						threadId: existingThread.id,
						...(await generateModmailMessage(message)),
					})
					.then(...generateReactionFunctions(message)),
			);
		} else if (
			[MessageType.Default, MessageType.Reply, MessageType.ThreadStarterMessage].includes(
				message.type,
			)
		) {
			const collector = await generateModmailConfirm(
				new EmbedBuilder()
					.setTitle("Confirmation")
					.setDescription(
						`Are you sure you want to send client message to **the ${escapeMessage(
							guild.name,
						)} server’s mod team**? This will ping all online mods, so please don’t abuse this if you don’t have a genuine reason for contacting us.`,
					)
					.setColor(MODMAIL_COLORS.confirm)
					.setAuthor({
						iconURL: guild.iconURL() ?? undefined,
						name: guild.name,
					}),
				async (buttonInteraction) => {
					const openedEmbed = new EmbedBuilder()
						.setTitle("Modmail ticket opened!")
						.setDescription(`Ticket by ${message.author.toString()}`)
						.setFooter({
							text:
								MODMAIL_UNSUPPORTED +
								CONSTANTS.footerSeperator +
								"Messages starting with an equals sign (=) are ignored.",
						})
						.setColor(MODMAIL_COLORS.opened);

					const newThread = await openModmail(openedEmbed, message.author.username, true);

					if (!webhook) throw new ReferenceError("Could not find webhook");

					await Promise.all([
						buttonInteraction.reply({
							content:
								`${CONSTANTS.emojis.statuses.yes} **Modmail ticket opened!** You may send the mod team messages by sending me DMs. I will DM you their messages. ` +
								MODMAIL_UNSUPPORTED,

							ephemeral: true,
						}),
						webhook
							.send({
								threadId: newThread.id,
								...(await generateModmailMessage(message)),
							})
							.then(...generateReactionFunctions(message)),
					]);
				},
				async (options) => await message.reply(options),
			);
			message.channel
				.createMessageCollector({ time: CONSTANTS.collectorTime })
				.on("collect", async () => {
					collector?.stop();
				});
		}
	}

	if (message.channel.isDMBased() || message.guild?.id !== GUILD_ID) {
		await Promise.all(promises);
		return;
	}

	if (
		message.channel.id === CONSTANTS.channels.board?.id &&
		message.type === MessageType.ChannelPinnedMessage
	) {
		await Promise.all([...promises, message.delete()]);
		return;
	}

	if (
		message.channel.type === ChannelType.GuildPublicThread &&
		message.channel.parent?.id === CONSTANTS.channels.modmail?.id &&
		!message.content.startsWith("=") &&
		(message.webhookId && message.author.id !== client.user?.id
			? (await message.fetchWebhook()).owner?.id !== client.user?.id
			: true) &&
		message.interaction?.commandName !== "modmail close"
	) {
		const member = await getUserFromModmail(message.channel);

		const messageToSend = await generateModmailMessage(message);

		messageToSend.content =
			message.author.toString() +
			":" +
			(messageToSend.content ? " " + messageToSend.content : "");

		reactions++;

		promises.push(member?.send(messageToSend).then(...generateReactionFunctions(message)));
	}

	// #upcoming-updates
	if (message.channel.id === "806605006072709130") {
		const thread = await message.startThread({
			name: truncateText(message.cleanContent || message.embeds[0]?.title || "[image]", 50),
		});
		await thread.send({ allowedMentions: {}, content: "<@&809063330857615361>" }); // @Update Tester
	}

	const mentions = (
		process.env.NODE_ENV === "production"
			? message.mentions.users.filter((user) => user.id !== message.author.id && !user.bot)
			: message.mentions.users
	).size;

	if (
		mentions > 4 &&
		CONSTANTS.roles.mod &&
		message.member &&
		!message.member.roles.resolve(CONSTANTS.roles.mod.id)
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

	if (CONSTANTS.channels.modlogs?.id !== getBaseChannel(message.channel)?.id) {
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

	const webhook =
		CONSTANTS.channels.modmail?.id == getBaseChannel(message.channel)?.id &&
		message.webhookId &&
		(await message.fetchWebhook()).applicationId === client.application.id;
	if (!message.author.bot || message.interaction || webhook) {
		if (!latestMessages[message.channel.id]) {
			const fetched = await message.channel.messages
				.fetch({ limit: 100, before: message.id })
				.then((messages) => messages.toJSON());

			/** @type {import("discord.js").Message<true>[]} */
			const res = [];
			for (
				let index = 0;
				index < fetched.length && res.length < NORMAL_XP_PER_MESSAGE;
				index++
			) {
				const item = fetched[index];
				item && (!item.author.bot || item.interaction) && res.push(item);
			}
			latestMessages[message.channel.id] = res;
		}
		const lastInChannel = latestMessages[message.channel.id] || [];
		const spam =
			(
				await asyncFilter(lastInChannel, async (foundMessage, index) => {
					if (webhook) {
						return (
							!(
								foundMessage.webhookId &&
								(await foundMessage.fetchWebhook()).applicationId ===
									client.application.id
							) && index
						);
					}
					return (
						![message.author.id, message.interaction?.user.id || ""].some((user) =>
							[foundMessage.author.id, foundMessage.interaction?.user.id].includes(
								user,
							),
						) && index
					);
				}).next()
			).value ?? -1;

		const newChannel = lastInChannel.length < NORMAL_XP_PER_MESSAGE;
		if (!newChannel) lastInChannel.pop();
		lastInChannel.unshift(message);
		const bot = 1 + +(!!message.interaction || /^(([crm]!|!d)\s*|=)\w+/.test(message.content)); // todo: update this

		await giveXp(
			(webhook &&
				message.channel.isThread() &&
				(await getUserFromModmail(message.channel))) ||
				message.interaction?.user ||
				message.author,
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
		[CONSTANTS.channels.board?.id, CONSTANTS.channels.modlogs?.id].includes(
			message.channel.id,
		) ||
		!(
			userSettingsDatabase.data.find(({ user }) => user === message.author.id)
				?.autoreactions ?? true
		)
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
		message.mentions.has(client.user?.id ?? "", {
			ignoreEveryone: true,
			ignoreRoles: true,
			ignoreRepliedUser: true,
		})
	)
		react("👋");

	await Promise.all(promises);
}
