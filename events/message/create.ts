import {
	MessageType,
	type Message,
	type EmojiIdentifierResolvable,
	type Snowflake,
	ComponentType,
	ButtonStyle,
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
import { remindersDatabase, SpecialReminders } from "../../commands/remind.js";

const latestMessages: { [key: Snowflake]: Message[] } = {};

const event: Event<"messageCreate"> = async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;
	if (message.channel.isDMBased() && message.author.id !== client.user.id)
		return await message.channel.send({
			content: `Are you trying to contact mods? We now use ${CONSTANTS.channels.contact?.toString()} instead of DMs!`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							type: ComponentType.Button,
							style: ButtonStyle.Primary,
							label: "Contact Mods",
							custom_id: "_contactMods",
						},
					],
				},
			],
		});
	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;

	if (await automodMessage(message)) return;

	if (message.interaction?.commandName === "bump" && message.author.id === "302050872383242240") {
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: "881619501018394725",
				date: Date.now() + 7260000,
				reminder: SpecialReminders.Bump,
				setAt: Date.now(),
				user: client.user.id,
			},
		];
	}

	if (message.channel.id === CONSTANTS.channels.updates?.id) {
		await message.startThread({
			name: truncateText(message.cleanContent?.split("\n")[0] || "New update!", 50),

			reason: "New upcoming update",
		});
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
		const bot = 1 + Number(Boolean(message.interaction));

		await giveXp(
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
		);
	}

	const content = stripMarkdown(normalize(message.content).replaceAll(/<.+?>/g, ""));

	if (
		(userSettingsDatabase.data.find(({ user }) => user === message.author.id)?.dad ?? false) &&
		content.match(/^i['"`‘’“”]?m\b/) &&
		CONSTANTS.channels.modlogs?.id !== baseChannel?.id &&
		CONSTANTS.channels.info?.id !== baseChannel?.parent?.id
	) {
		const name =
			content.split(
				/[៚๛๚܌܊፨៕។။၊॥।·｡。᙮᠉᠃።܂܁۔﹒．.‽᥅፧܉؟⁇⁈﹖？?᥄⁉‼﹗！!᛭᛬᛫៖᠅᠄፦፥፤፣፡܈܇܆܅܄܃։﹕：:؛﹔；;;､﹑、᠈᠂،﹐，,\s]+/gm,
			)[1] ?? "";
		const capitalized = (name[0] ?? "").toUpperCase() + name.slice(1);
		const greetings = [
			"Hey",
			"Hi",
			"Hello",
			"Yo",
			"Ayy,",
			"Howdy",
			"Greetings",
			"Salutations",
			"Hiya",
			"Aloha",
			"Hola",
			"Bonjour",
			"Whattup",
			"👋",
		];
		if (capitalized)
			await message.reply({
				content: `${
					greetings[Math.floor(Math.random() * greetings.length)]
				} ${capitalized}${Math.random() > 0.5 ? "!" : ","} I’m Scradd!`,
			});
	}

	// Autoreactions start here.

	const REACTION_CAP = 2;
	let reactions = 0;

	/**
	 * Attempt to react with an emoji.
	 *
	 * @param emoji - The emoji to react with.
	 */
	function react(emoji: EmojiIdentifierResolvable) {
		if (reactions > REACTION_CAP) return;
		reactions++;
		return message.react(emoji);
	}

	if (
		[
			MessageType.GuildBoost,
			MessageType.GuildBoostTier1,
			MessageType.GuildBoostTier2,
			MessageType.GuildBoostTier3,
		].includes(message.type)
	)
		await react(BOARD_EMOJI);

	// Don’t react to users who disabled the setting.
	if (
		message.interaction ||
		CONSTANTS.channels.modlogs?.id === baseChannel?.id ||
		CONSTANTS.channels.info?.id === baseChannel?.parent?.id ||
		!(
			userSettingsDatabase.data.find(({ user }) => user === message.author.id)
				?.autoreactions ?? true
		)
	)
		return;

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
		await react(CONSTANTS.emojis.autoreact.e);
	if (includes("dango") && !content.includes("🍡")) await react("🍡");
	if (includes(/av[ao]cado/) && !content.includes("🥑")) await react("🥑");
	if (includes("sat on addon") && reactions < REACTION_CAP) {
		reactions += 3;
		await reactAll(message, CONSTANTS.emojis.autoreact.soa);
	}

	// Server jokes
	if (includes(/taco(?:d(?:ude|iva))?/, false)) await react(CONSTANTS.emojis.autoreact.taco);
	if (includes("bob", false)) await react(CONSTANTS.emojis.autoreact.bob);
	if (content.includes("( ∘)つ")) await react(CONSTANTS.emojis.autoreact.sxd);
	if (includes("doost", false) || includes("dooster"))
		await react(CONSTANTS.emojis.autoreact.boost);
	if ((content.includes("quack") || includes("duck")) && !content.includes("🦆"))
		await react("🦆");
	if (content === "radio") await react("📻");
	if (content.match(/^fr+\b/)) await react("🇫🇷");
	if (content === "agreed") await react(CONSTANTS.emojis.autoreact.mater);
	if (includes(/te[rw]+a+/) || /👉\s*👈/.test(message.content))
		await react(CONSTANTS.emojis.autoreact.tera);
	if ((includes("snake") || includes("snek")) && reactions < REACTION_CAP) {
		reactions += 3;
		await reactAll(message, CONSTANTS.emojis.autoreact.snakes);
	}

	// Discord jokes
	if (includes("robotop", false)) await react(CONSTANTS.emojis.autoreact.rip);
	if (
		(includes("mee6", false) || includes("dyno", false) || includes(/carl[ -]?bot/)) &&
		!(content.includes("🤮") || content.includes("🤢"))
	)
		await react("🤮");
	if (
		message.mentions.has(client.user.id, {
			ignoreEveryone: true,
			ignoreRoles: true,
			ignoreRepliedUser: true,
		}) &&
		message.author.id !== client.user.id
	)
		await react("👋");

	// Scratch jokes
	if (includes(/j[eo]f+[ao]l+o/, false) || includes(/buf+[ao]l+o/, false))
		await react(CONSTANTS.emojis.autoreact.jeffalo);
	if (includes(/wasteof\.(?!money)/, false)) await react(CONSTANTS.emojis.autoreact.wasteof);
	if (
		(content.includes("garbo") || includes(/garbage? ?(?:muffin|man)/, false)) &&
		!content.includes("turbo")
	)
		await react(CONSTANTS.emojis.autoreact.tw);
	if (includes(/griff(?:patch)?y?/, false)) await react(CONSTANTS.emojis.autoreact.griffpatch);
	if (includes("appel")) await react(CONSTANTS.emojis.autoreact.appel);

	// Internet jokes
	if (includes("sus", false)) await react(CONSTANTS.emojis.autoreact.sus);
	if (
		includes(/gives? ?you ?up/i, false) ||
		includes(/rick[ -]?rol+/) ||
		includes("astley", false) ||
		message.content.includes("dQw4w9WgXcQ")
	)
		await react(CONSTANTS.emojis.autoreact.rick);
};
export default event;
