import {
	MessageType,
	type Message,
	type EmojiIdentifierResolvable,
	type Snowflake,
} from "discord.js";

import client from "../../client.js";
import { userSettingsDatabase } from "../../commands/settings.js";
import automodMessage from "../../common/automod.js";
import { BOARD_EMOJI } from "../../common/board.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import giveXp, { DEFAULT_XP } from "../../common/xp.js";
import { getBaseChannel, reactAll } from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { normalize, truncateText } from "../../util/text.js";

import type Event from "../../common/types/event";

const latestMessages: { [key: Snowflake]: Message[] } = {};

const event: Event<"messageCreate"> = async function event(message) {
	if (
		message.flags.has("Ephemeral") ||
		message.type === MessageType.ThreadStarterMessage ||
		message.channel.isDMBased() ||
		message.guild?.id !== CONSTANTS.guild.id
	)
		return;

	if (
		message.channel.id === CONSTANTS.channels.board?.id &&
		message.type === MessageType.ChannelPinnedMessage
	) {
		await message.delete();
		return;
	}

	if (await automodMessage(message)) return;

	const promises = [];
	let reactions = 0;

	// #upcoming-updates
	if (message.channel.id === "806605006072709130") {
		promises.push(
			message.startThread({
				name: truncateText(message.cleanContent || "New update!", 50),

				reason: "New upcoming update",
			}),
		);
	}

	const baseChannel = getBaseChannel(message.channel);

	// XP
	if (process.env.NODE_ENV !== "production" || !message.author.bot || message.interaction) {
		if (!latestMessages[message.channel.id]) {
			const fetched = await message.channel.messages
				.fetch({ limit: 100, before: message.id })
				.then((messages) => messages.toJSON());

			const accumulator: Message<true>[] = [];
			for (
				let index = 0;
				index < fetched.length && accumulator.length < DEFAULT_XP;
				index++
			) {
				const item = fetched[index];
				if (item && (!item.author.bot || item.interaction)) accumulator.push(item);
			}
			latestMessages[message.channel.id] = accumulator;
		}
		const lastInChannel = latestMessages[message.channel.id] ?? [];
		const spam = lastInChannel.findIndex((foundMessage) => {
			return ![message.author.id, message.interaction?.user.id || ""].some((user) =>
				[foundMessage.author.id, foundMessage.interaction?.user.id].includes(user),
			);
		});

		const newChannel = lastInChannel.length < DEFAULT_XP;
		if (!newChannel) lastInChannel.pop();
		lastInChannel.unshift(message);
		const bot =
			1 +
			Number(
				Boolean(message.interaction) ||
					/^(?:r!|<@323630372531470346>)\s*\w+/i.test(message.content),
			);

		promises.push(
			giveXp(
				message.interaction?.user || message.author,
				message.url,
				spam === -1 && !newChannel
					? 1
					: Math.max(
							1,
							Math.round(
								(DEFAULT_XP - (newChannel ? lastInChannel.length - 1 : spam)) /
									bot /
									(1 +
										Number(
											![
												MessageType.Default,
												MessageType.GuildBoost,
												MessageType.GuildBoostTier1,
												MessageType.GuildBoostTier2,
												MessageType.GuildBoostTier3,
												MessageType.Reply,
												MessageType.ChatInputCommand,
												MessageType.ContextMenuCommand,
											].includes(message.type),
										)),
							),
					  ),
			),
		);
	}

	// Autoreactions start here.

	const REACTION_CAP = 2;

	/**
	 * Attempt to react with an emoji.
	 *
	 * @param emoji - The emoji to react with.
	 */
	function react(emoji: EmojiIdentifierResolvable): void {
		if (reactions > REACTION_CAP) return;
		reactions++;
		const promise = message.react(emoji).catch(console.error);
		promises.push(promise);
	}

	if (
		[
			MessageType.GuildBoost,
			MessageType.GuildBoostTier1,
			MessageType.GuildBoostTier2,
			MessageType.GuildBoostTier3,
		].includes(message.type)
	)
		react(BOARD_EMOJI);

	// Don’t react to users who disabled the setting.
	if (
		message.interaction ||
		CONSTANTS.channels.modlogs?.id === baseChannel?.id ||
		CONSTANTS.channels.info?.id === baseChannel?.parent?.id ||
		!(
			userSettingsDatabase.data.find(({ user }) => user === message.author.id)
				?.autoreactions ?? true
		)
	) {
		await Promise.all(promises);
		return;
	}

	const content = stripMarkdown(normalize(message.content).replaceAll(/<.+?>/g, ""));

	/**
	 * Determines whether the message contains a word.
	 *
	 * @param text - The word to check for.
	 * @param plural
	 *
	 * @returns Whether the message contains the word.
	 */
	function includes(text: RegExp | string, plural = true): boolean {
		return new RegExp(
			`\\b${typeof text === "string" ? text : `(?:${text.source})`}${
				plural ? "(?:e?s)?" : ""
			}\\b`,
			"i",
		).test(content);
	}

	// SA jokes
	if (
		["e", "ae", "iei", "a", "."].includes(stripMarkdown(normalize(content))) ||
		content.includes("æ")
	)
		react(CONSTANTS.emojis.autoreact.e);
	if (includes("dango") && !content.includes("🍡")) react("🍡");
	if (includes(/av[ao]cado/) && !content.includes("🥑")) react("🥑");
	if (includes("sat on addon") && reactions < REACTION_CAP) {
		reactions += 3;
		promises.push(reactAll(message, CONSTANTS.emojis.autoreact.soa));
	}

	// Server jokes
	if (includes("bob", false)) react(CONSTANTS.emojis.autoreact.bob);
	if (content.includes("( ∘)つ")) react(CONSTANTS.emojis.autoreact.sxd);
	if (includes("doost") || includes("dooster")) react(CONSTANTS.emojis.autoreact.boost);
	if ((content.includes("quack") || includes("duck")) && !content.includes("🦆")) react("🦆");
	if (content === "radio") react("📻");
	if (content === "agreed") react(CONSTANTS.emojis.autoreact.mater);
	if (includes(/te[rw]+a+/) || /👉\s*👈/.test(message.content))
		react(CONSTANTS.emojis.autoreact.tera);
	if ((includes("snake") || includes("snek")) && reactions < REACTION_CAP) {
		reactions += 3;
		promises.push(reactAll(message, CONSTANTS.emojis.autoreact.snakes));
	}

	// Discord jokes
	if (
		(includes("mee6") || includes("dyno")) &&
		!(content.includes("🤮") || content.includes("🤢"))
	)
		react("🤮");
	if (
		message.mentions.has(client.user.id, {
			ignoreEveryone: true,
			ignoreRoles: true,
			ignoreRepliedUser: true,
		}) &&
		message.author.id !== client.user.id
	)
		react("👋");

	// Scratch jokes
	if (includes(/j[eo]f+[ao]l+o/) || includes(/buf+[ao]l+o/))
		react(CONSTANTS.emojis.autoreact.jeffalo);
	if (includes(/wasteof\.(?!money)/, false)) react(CONSTANTS.emojis.autoreact.wasteof);
	if (
		(content.includes("garbo") || includes(/garbag(?:(?:e )?muffin|man)?/)) &&
		!content.includes("turbo")
	)
		react(CONSTANTS.emojis.autoreact.tw);
	if (includes(/griff(?:patch)?y?/)) react(CONSTANTS.emojis.autoreact.griffpatch);
	if (includes("appel")) react(CONSTANTS.emojis.autoreact.appel);

	// Internet jokes
	if (includes("sus", false)) react(CONSTANTS.emojis.autoreact.sus);
	if (
		includes(/gives? ?you ?up/i, false) ||
		includes(/rick[ -]?rol+/) ||
		includes("astley") ||
		message.content.includes("dQw4w9WgXcQ")
	)
		react(CONSTANTS.emojis.autoreact.rick);

	await Promise.all(promises);
};
export default event;
