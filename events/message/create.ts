import { MessageType, type Message, type Snowflake, ComponentType, ButtonStyle } from "discord.js";

import client from "../../client.js";
import { getSettings } from "../../commands/settings.js";
import automodMessage from "../../common/automod.js";
import { BOARD_EMOJI } from "../../common/board.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import giveXp, { DEFAULT_XP } from "../../common/xp.js";
import { getBaseChannel, reactAll } from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { normalize, truncateText } from "../../util/text.js";

import type Event from "../../common/types/event";
import { remindersDatabase, SpecialReminders } from "../../commands/reminders.js";
import { autoreactions, dad, isAprilFools } from "../../secrets.js";

const latestMessages: { [key: Snowflake]: Message[] } = {};

const event: Event<"messageCreate"> = async function event(message) {
	if (message.flags.has("Ephemeral") || message.type === MessageType.ThreadStarterMessage) return;
	if (
		message.channel.isDMBased() &&
		message.author.id !== client.user.id &&
		CONSTANTS.channels.contact?.permissionsFor(message.author)?.has("ViewChannel")
	) {
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
	}
	if (message.channel.isDMBased() || message.guild?.id !== CONSTANTS.guild.id) return;

	if (await automodMessage(message)) return;

	if (message.interaction?.commandName === "bump" && message.author.id === "302050872383242240") {
		remindersDatabase.data = [
			...remindersDatabase.data,
			{
				channel: "881619501018394725",
				date: Date.now() + 7260000,
				reminder: undefined,
				id: SpecialReminders.Bump,
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

	const content = stripMarkdown(normalize(message.content));

	const REACTION_CAP = 3;
	let reactions = 0;

	if (
		[
			MessageType.GuildBoost,
			MessageType.GuildBoostTier1,
			MessageType.GuildBoostTier2,
			MessageType.GuildBoostTier3,
		].includes(message.type)
	) {
		try {
			await message.react(BOARD_EMOJI);
			reactions++;
		} catch {
			return;
		}
	}

	if (
		(message.interaction ||
			CONSTANTS.channels.modlogs?.id === baseChannel?.id ||
			CONSTANTS.channels.info?.id === baseChannel?.parent?.id ||
			!getSettings(message.author).autoreactions) &&
		!isAprilFools
	)
		return;

	if (content.match(/^i['"`‘’“”]?m\b/)) {
		const name = content
			.split(
				/[៚๛๚܌܊፨៕។။၊॥।·｡。᙮᠉᠃።܂܁۔﹒．.‽᥅፧܉؟⁇⁈﹖？?᥄⁉‼﹗！!᛭᛬᛫៖᠅᠄፦፥፤፣፡܈܇܆܅܄܃։﹕：:؛﹔；;;､﹑、᠈᠂،﹐，,\n]+/gm,
			)[0]
			?.split(/\s/g)
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		if (name) {
			if (CONSTANTS.channels.bots?.id === baseChannel?.id || isAprilFools) {
				return await message.reply({
					content: dad(name, message.author),
					allowedMentions: { users: [] },
				});
			}
			reactions++;
			return await message.react("👋").catch(() => {});
		}
	}

	for (const [emoji, ...requirements] of autoreactions) {
		if (typeof emoji == "string" && content.includes(emoji)) continue;

		const results = requirements.map((requirement) => {
			const type = Array.isArray(requirement) ? requirement[1] : "word";
			if (!(["partial", "full", "raw", "plural", "negative", "word"] as const).includes(type))
				throw new TypeError("Unknown type: " + type);

			const pre = type === "partial" || type === "raw" ? "" : type === "full" ? "^" : "\\b";

			const rawMatch = Array.isArray(requirement) ? requirement[0] : requirement;
			const match = typeof rawMatch === "string" ? rawMatch : rawMatch.source;

			const appendage = type === "plural" ? "(?:e?s)?" : "";

			const post = type === "partial" || type === "raw" ? "" : type === "full" ? "$" : "\\b";

			const result = new RegExp(`${pre}${match}${appendage}${post}`, "i").test(
				type === "raw" ? message.content : content,
			);

			return type === "negative" ? result && 0 : result;
		});
		if (results.includes(true) && !results.includes(0)) {
			const emojis = [emoji].flat();
			reactions += emojis.length;
			const messageReactions = await reactAll(message, emojis);
			if (reactions > REACTION_CAP || !messageReactions) return;
		}
	}
};
export default event;
