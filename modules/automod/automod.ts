import type { Message } from "discord.js";
import { client } from "strife.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import {
	getBaseChannel,
	GlobalAnimatedEmoji,
	GlobalBotInvitesPattern,
	GlobalInvitesPattern,
} from "../../util/discord.js";
import log, { LoggingErrorEmoji } from "../logging/misc.js";
import { PARTIAL_STRIKE_COUNT } from "../punishments/misc.js";
import warn from "../punishments/warn.js";
import censor, { badWordRegexps, badWordsAllowed } from "./language.js";
import { stripMarkdown } from "../../util/markdown.js";

const WHITELISTED_INVITE_GUILDS = [
	config.guild.id,
	"751206349614088204", // Scratch Addons development
	"837024174865776680", // TurboWarp
	constants.testingServerId,
	"461575285364752384", // 9th Tail Bot Hub
	"898383289059016704", // Scratch Addons SMP Archive
	"945340853189247016", // ScratchTools
];

export default async function automodMessage(message: Message) {
	const allowBadWords = badWordsAllowed(message.channel);
	const baseChannel = getBaseChannel(message.channel);
	const parentChannel =
		baseChannel && baseChannel.isDMBased() ? baseChannel : baseChannel?.parent;

	const animatedEmojis = message.content.match(GlobalAnimatedEmoji);

	const badAnimatedEmojis =
		animatedEmojis &&
		animatedEmojis.length > 15 &&
		Math.floor((animatedEmojis.length - 16) / 10) * PARTIAL_STRIKE_COUNT;

	let needsDelete = false;

	if (baseChannel?.id !== config.channels.bots?.id && typeof badAnimatedEmojis === "number") {
		needsDelete = true;
		await warn(
			message.author,
			"Please don’t post that many animated emojis!",
			badAnimatedEmojis,
			animatedEmojis?.map((emoji) => emoji).join(""),
		);
		await message.channel.send(
			`${
				constants.emojis.statuses.no
			} ${message.author.toString()}, less animated emojis please!`,
		);
	}

	if (
		!allowBadWords &&
		config.channels.info?.id !== parentChannel?.id &&
		config.channels.advertise &&
		config.channels.advertise.id !== baseChannel?.id &&
		!message.author?.bot
	) {
		const invites = (
			await Promise.all(
				(message.content.match(GlobalInvitesPattern) ?? []).map(async (code) => {
					const invite = await client?.fetchInvite(code).catch(() => {});
					return (
						invite?.guild &&
						!WHITELISTED_INVITE_GUILDS.includes(invite.guild.id) &&
						code
					);
				}),
			)
		).filter((toWarn): toWarn is string => Boolean(toWarn));

		if (invites.length) {
			needsDelete = true;
			await warn(
				message.author,
				"Please don’t send server invites in that channel!",
				invites.length,
				invites.join("\n"),
			);
			await message.channel.send(
				`${
					constants.emojis.statuses.no
				} ${message.author.toString()}, only post invite links in ${config.channels.advertise.toString()}!`,
			);
		}

		const bots = message.content.match(GlobalBotInvitesPattern);
		if (bots?.length) {
			needsDelete = true;
			await warn(
				message.author,
				"Please don’t post bot invite links!",
				bots.length,
				bots.join("\n"),
			);
			await message.channel.send(
				`${
					constants.emojis.statuses.no
				} ${message.author.toString()}, bot invites go to ${config.channels.advertise.toString()}!`,
			);
		}
	}

	if (!allowBadWords) {
		const badWords = [
			censor(stripMarkdown(message.content)),
			...message.stickers.map(({ name }) => censor(name)),
		].reduce<string[][]>(
			(bad, censored, index) =>
				typeof censored === "boolean"
					? bad
					: [
							...(index ? [] : [[]]), // Increase the severity of content warns. All warns are decreased a severity later.
							...bad.map((words, index) => [
								...words,
								...(censored.words?.[index] ?? []),
							]),
					  ],

			Array(badWordRegexps.length).fill([]),
		);
		const badEmbedWords = message.embeds
			.flatMap((embed) => [
				embed.description,
				embed.title,
				embed.footer?.text,
				embed.author?.name,
				...embed.fields.flatMap((field) => [field.name, field.value]),
			])
			.reduce<string[][]>((bad, current) => {
				const censored = censor(current || "");
				return typeof censored === "boolean"
					? bad
					: bad.map((words, index) => [...words, ...(censored.words?.[index] ?? [])]);
			}, Array(badWordRegexps.length).fill([]));

		if (badWords || needsDelete) {
			if (!message.deletable)
				log(`${LoggingErrorEmoji} Missing permissions to delete ${message.url}`);

			message.delete();
		} else if (badEmbedWords) await message.suppressEmbeds();

		if (badWords || badEmbedWords) {
			await warn(
				message.interaction?.user ?? message.author,
				"Watch your language!",
				[...(badWords ?? []), ...(badEmbedWords ?? [])].reduce(
					(accumulator, current, index) =>
						current.length * Math.max(index - 1, PARTIAL_STRIKE_COUNT) + accumulator,
					0,
				),
				`Sent message with words: ${[
					...(badWords.flat() ?? []),
					...(badEmbedWords.flat() ?? []),
				].join(", ")}`,
			);
			await message.channel.send(
				`${constants.emojis.statuses.no} ${message.author.toString()}, language!`,
			);
		}
	}

	return !needsDelete;
}
