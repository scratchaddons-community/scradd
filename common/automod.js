import client from "../client.js";
import {
	getBaseChannel,
	GlobalAnimatedEmoji,
	GlobalBotInvitesPattern,
	GlobalInvitesPattern,
} from "../util/discord.js";
import { stripMarkdown } from "../util/markdown.js";
import CONSTANTS from "./CONSTANTS.js";
import censor, { badWordsAllowed } from "./language.js";
import warn from "./punishments.js";

/**
 * Detect if a string has banned parts.
 *
 * @param {string} toCensor - The string to check.
 * @param {import("discord.js").Message | import("discord.js").PartialMessage} message - The message the string is from.
 */
async function checkString(toCensor, message) {
	/**
	 * @type {{
	 * 	language: false | number;
	 * 	invites: false | number;
	 * 	bots: false | number;
	 * 	words: { language: string[]; invites: string[]; bots: string[] };
	 * }}
	 */
	const bad = {
		language: false,
		invites: false,
		bots: false,
		words: { language: [], invites: [], bots: [] },
	};

	if (!badWordsAllowed(message.channel)) {
		const censored = censor(toCensor);

		if (censored) {
			bad.words.language.push(...censored.words.flat());
			bad.language = censored.strikes;
		}
	}

	const baseChannel = getBaseChannel(message.channel);
	const parentChannel = baseChannel?.isDMBased() ? baseChannel : baseChannel?.parent;

	if (
		!badWordsAllowed(message.channel) &&
		CONSTANTS.channels.info?.id !== parentChannel?.id &&
		CONSTANTS.channels.advertise?.id !== baseChannel?.id &&
		!message.author?.bot
	) {
		const botLinks = GlobalBotInvitesPattern.exec(toCensor);

		if (botLinks) {
			bad.words.bots.push(...botLinks);
			bad.bots = botLinks.length;
		}

		const inviteCodes = GlobalInvitesPattern.exec(toCensor);

		if (inviteCodes) {
			const invitesToDelete = (
				await Promise.all(
					inviteCodes.map(async (code) => {
						const invite = await client?.fetchInvite(code).catch(() => {});

						return invite?.guild && invite.guild.id !== message.guild?.id && code;
					}),
				)
			).filter(/** @returns {toWarn is string} */ (toWarn) => Boolean(toWarn));

			if (invitesToDelete.length > 0) {
				bad.words.invites.push(...invitesToDelete);
				bad.invites = invitesToDelete.length;
			}
		}
	}

	return bad;
}

/**
 * Delete a message if it breaks rules.
 *
 * @param {import("discord.js").Message} message - The message to check.
 *
 * @returns {Promise<boolean>} - Whether the message was deleted.
 */
export default async function automodMessage(message) {
	const bad = (
		await Promise.all([
			checkString(stripMarkdown(message.content), message),
			...message.stickers.map(async ({ name }) => await checkString(name, message)),
		])
	).reduce(
		(bad, censored) => ({
			language:
				censored.language === false
					? bad.language
					: Number(bad.language) + censored.language,

			invites:
				censored.invites === false ? bad.invites : Number(bad.invites) + censored.invites,

			bots: censored.bots === false ? bad.bots : Number(bad.bots) + censored.bots,

			words: {
				language: [...censored.words.language, ...bad.words.language],
				invites: [...censored.words.invites, ...bad.words.invites],
				bots: [...censored.words.bots, ...bad.words.bots],
			},
		}),
		{
			language: false,
			invites: false,
			bots: false,
			words: { language: [], invites: [], bots: [] },
		},
	);

	const toWarn = [bad.language, bad.invites, bad.bots].filter(
		/** @returns {strikes is number} */ (strikes) => strikes !== false,
	);

	const embedStrikes =
		!badWordsAllowed(message.channel) &&
		message.embeds
			.flatMap((embed) => [
				embed.description,
				embed.title,
				embed.footer?.text,
				embed.author?.name,
				...embed.fields.flatMap((field) => [field.name, field.value]),
			])
			.reduce((strikes, current) => {
				const censored = current && censor(current);

				if (censored) bad.words.language.push(...censored.words.flat());

				return censored ? Number(strikes) + censored.strikes : strikes;
			}, /** @type {number | false} */ (false));

	if (typeof embedStrikes === "number")
		bad.language = (bad.language || 0) + Math.max(embedStrikes - 1, 0);

	const promises = [];

	if (toWarn.length > 0) promises.push(message.delete());
	else if (typeof embedStrikes === "number") promises.push(message.suppressEmbeds());

	const user = message.interaction?.user || message.author;

	if (typeof bad.language === "number") {
		promises.push(
			warn(
				user,
				"Watch your language!",
				bad.language,
				`Sent message with words:\n${bad.words.language.join("\n")}`,
			),
			message.channel.send(`${CONSTANTS.emojis.statuses.no} ${user.toString()}, language!`),
		);
	}

	if (CONSTANTS.channels.advertise) {
		if (typeof bad.invites === "number") {
			promises.push(
				warn(
					user,
					"Please don’t send server invites in that channel!",
					bad.invites,
					bad.words.invites.join("\n"),
				),
				message.channel.send(
					`${
						CONSTANTS.emojis.statuses.no
					} ${user.toString()}, only post invite links in ${CONSTANTS.channels.advertise.toString()}!`,
				),
			);
		}

		if (typeof bad.bots === "number") {
			promises.push(
				warn(
					user,
					"Please don’t post bot invite links!",
					bad.bots,
					bad.words.bots.join("\n"),
				),
				message.channel.send(
					`${
						CONSTANTS.emojis.statuses.no
					} ${user.toString()}, bot invites go to ${CONSTANTS.channels.advertise.toString()}!`,
				),
			);
		}
	}

	const animatedEmojis = Array.from(message.content.matchAll(GlobalAnimatedEmoji));

	const badAnimatedEmojis =
		animatedEmojis.length > 9 && Math.round((animatedEmojis.length - 10) / 10);

	if (
		getBaseChannel(message.channel)?.id !== CONSTANTS.channels.bots?.id &&
		typeof badAnimatedEmojis === "number"
	) {
		promises.push(
			warn(
				user,
				"Please don’t post that many animated emojis!",
				badAnimatedEmojis,
				animatedEmojis.map((emoji) => emoji[0]).join("\n"),
			),
			message.channel.send(
				`${
					CONSTANTS.emojis.statuses.no
				} ${user.toString()}, lay off on the animated emojis please!`,
			),
			message.delete(),
		);
	}

	await Promise.all(promises);

	return toWarn.length > 0;
}
