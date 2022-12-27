// TODO: split up file into `language`, `automod`, and `nicknames` `.js`.
import { ChannelType, PermissionFlagsBits } from "discord.js";

import client from "../client.js";
import {
	getBaseChannel,
	GlobalAnimatedEmoji,
	GlobalBotInvitesPattern,
	GlobalInvitesPattern,
} from "../util/discord.js";
import { stripMarkdown } from "../util/markdown.js";
import { caesar, joinWithAnd, pingablify, normalize } from "../util/text.js";
import CONSTANTS from "./CONSTANTS.js";
import warn, { PARTIAL_STRIKE_COUNT } from "./punishments.js";

/**
 * The index of each array determines how many strikes the word gives.
 *
 * The second sub-array is for words that must be surrounded by a word boundary.
 *
 * All words are ROT13-encoded.
 *
 * @type {[RegExp[], RegExp[]][]}
 */
const badWords = [
	[
		[
			/cbea/,
			/grfgvpyr/,
			/fpuzhpx/,
			/erpghz/,
			/ihyin/,
			/🖕/,
			/卐/,
			/fjnfgvxn/,
			/卍/,
			/lvss/,
			/ahg ?fnpx/,
		],
		[
			/intva(?:f|l|n|r|y)+/,
			/(?:urzv ?)?cravf(?:rf)?/,
			/nahf(?:rf)?/,
			/frzra/,
			/(?:c(?:bfg|er) ?)?phz/,
			/pyvg/,
			/gvg(?:(?:gvr)?f)?/,
			/chff(?:l|vrf)/,
			/fpebghz/,
			/ynovn/,
			/xlf/,
			/preivk/,
			/ubeal/,
			/obaref?/,
			/fcrez/,
		],
	],
	[
		[
			/fuv+r*g(?!nx(?:r|v))/,
			/rwnphyngr/,
			/fcyb+tr/,
			/oybj ?wbo/,
			/shpx/,
			/wvmm/,
			/wvfz/,
			/znfg(?:h|r)eong/,
			/ohgg ?cvengr/,
			/qvyqb/,
			/xhxfhtre/,
			/dhrrs/,
			/wnpx ?bss/,
			/wrex ?bss/,
			/ovg?pu/,
			/ubeal/,
		],
		[
			/(?:ovt ?)?qvp?xr?(?: ?(?:q|l|evat|ef?|urnqf?|vre?|vat|f|jnqf?))?/,
			/(?:8|o)=+Q/,
			/fzhg+(?:e|fg?|l|vr)?/,
			/pbpx(?: ?svtug|fhpx|(?:fhpx|svtug)(?:re|vat)|znafuvc|hc)?f?/,
			/onfgneq(?:vfz|(?:e|y)?l|evrf|f)?/,
			/phagf?/,
			/shx/,
			/ovg?fu/,
			/jnax(?:v?ref?|v(?:at|rfg)|yr|f|l)?/,
		],
	],
	[
		[
			/puvat ?(?:punat ?)?puba/,
			/xvxr/,
			/pnecrg ?zhapure/,
			/fyhg/,
			/fur ?znyr/,
			/shqtr ?cnpxr/,
			/ergneq/,
		],
		[
			/tbbx(?:f|l)?/,
			/yrfobf?/,
			/fcvpf?/,
			/j?uber/,
			/av+t{2,}(?:(?:h|r)?e|n)(?: ?rq|l|qbz|urnq|vat|vf(?:u|z)|yvat)?f?/,
			/snv?t+(?:rq|vr(?:e|fg)|va|vg|bgf?|bge?l|l)?f?/,
			/wnc(?:rq?|r?f|vatf?|crq|cvat|cn)?/,
		],
	],
];

if (process.env.NODE_ENV !== "production") badWords[1]?.[0].push(/nhgbzbqzhgr/);

/**
 * Decodes RegExes to not be rot13'd & to add unicode letter fonts.
 *
 * @param {RegExp[]} regexes - RegExes to decode.
 *
 * @returns {string} Decoded RegExes.
 */
function decodeRegexes(regexes) {
	return regexes
		.map(({ source }) =>
			caesar(source).replaceAll(
				// eslint-disable-next-line @redguy12/no-character-class -- It's OK to use a character class here.
				/[ a-z]/gi,
				(letter) =>
					`[${
						{
							"q": "ϙϱ۹qℚoｑⓠ⒬",
							"w": "wｗሠⓦ⒲",
							"e": "e❸③３₃³⑶ꮛɛჳ⓷еₑ*ｅⓔℨ3⒠",
							"r": "rℝｒዪ尺ⓡ⒭",
							"t": "tｔፕⓣℑₜ⒯",
							"y": "vyγሃｙⓨ⒴",
							"u": "vሁυu*ሀｕⓤ⒰",
							"i": "iⁱ*ᴉjｉіⓘℹ❶①１₁¹⑴⇂⥜⓵ⅰ❗❕!¡l|1ℑ⒤",
							"o": "ዐοoₒዕ*ｏⓞ⓪⓿０₀⁰θ○⭕0⒪",
							"p": "የₚℙpｐⓟ⒫",
							"a": "aɒₐ*ａαⓐ@⒜",
							"s": "sᔆₛｓaⓢz$⒮",
							"d": "ɒdｄⓓ⒟",
							"f": "⸁fᶠｆⓕ⒡",
							"g": "gｇⓖ⒢",
							"h": "ʜhₕｈክዪዘℜℍⓗℌ#⒣",
							"j": "jⱼյｊⓙℑ⒥",
							"k": "kₖｋⓚ⒦",
							"l": "ₗｌⓛl|⒧",
							"z": "zᙆᶻｚℤs乙ⓩ⒵",
							"x": "xᕽₓｘⓧﾒ⒳",
							"c": "cᑦᶜℂｃℭⓒ⒞",
							"v": "vⱽｖ√✅u☑✔ⓥ⒱",
							"b": "ｂⓑb⒝d",
							"n": "ⁿₙnሸℕｎⓝ⒩",
							"m": "ₘｍʍﾶጠⓜⓂ️m⒨",
							" ": "^\\w",
						}[letter] || ""
					}${letter}]`,
			),
		)
		.join("|");
}

const badWordRegexps = badWords.map(
	([strings, words]) =>
		new RegExp(`${decodeRegexes(strings)}|\\b(?:${decodeRegexes(words)})\\b`, "gi"),
);

/**
 * @typedef CensoredText
 *
 * @property {string} censored - The text with bad words censored out.
 * @property {number} strikes - The number of strikes this gives. Verbal warns are included as 0.25.
 * @property {string[][]} words - The caught words. The index of the subarray is how many strikes it gave. (Verbal warns are index 0).
 */

/**
 * Censors text.
 *
 * @param {string} text - The text to censor.
 *
 * @returns {false | CensoredText} - False if there was nothing to censor, a CensoredText object if there was.
 */
export function censor(text) {
	/** @type {string[][]} */
	const words = [];
	const censored = badWordRegexps.reduce((string, regexp, index) => {
		words[index] ??= [];

		return string.replaceAll(regexp, (censored) => {
			words[index]?.push(censored);

			return censored[0] + "#".repeat(censored.length - 1);
		});
	}, normalize(text));

	return words.flat().length > 0
		? {
				censored,

				strikes: words.reduce(
					(accumulator, current, index) =>
						current.length * Math.max(index, PARTIAL_STRIKE_COUNT) + accumulator,
					0,
				),

				words,
		  }
		: false;
}

/**
 * Check if bad words are allowed in a channel.
 *
 * @param {import("discord.js").TextBasedChannel | null} channel - The channel to check.
 *
 * @returns {boolean} - Whether bad words are allowed.
 */
export function badWordsAllowed(channel) {
	const baseChannel = getBaseChannel(channel);

	return (
		baseChannel?.type === ChannelType.DM ||
		!baseChannel?.permissionsFor(baseChannel.guild.id)?.has(PermissionFlagsBits.ViewChannel)
	);
}

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
export async function automodMessage(message) {
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

const NICKNAME_RULE = 8;

/**
 * Set a users nickname, unless they aren't moderatable, in which case send a warning in #mod-logs.
 *
 * @param {import("discord.js").GuildMember} member - The member to rename.
 * @param {string} newNickname - Their new nickname.
 * @param {string} [reason] - The reason for the change.
 */
async function setNickname(member, newNickname, reason = `To comply with rule ${NICKNAME_RULE}`) {
	if (member.nickname === newNickname) return member;

	if (member.moderatable) {
		if (censor(newNickname) || pingablify(newNickname) !== newNickname) return false;

		return await member.setNickname(newNickname, reason);
	}

	await CONSTANTS.channels.modlogs?.send({
		allowedMentions: { users: [] },
		content: `⚠ Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\` (${reason}).`,
	});

	return false;
}

/**
 * Checks a user's nickname for rule 7 and changes it if it is rulebreaking.
 *
 * @param {import("discord.js").GuildMember} member - The member to change nickname of.
 * @param {boolean} shouldWarn - Whether to warn them if it has bad words.
 *
 * @todo Invite links? (Xan)
 */
export async function changeNickname(member, shouldWarn = true) {
	const censored = censor(member.displayName);

	if (censored) {
		await Promise.all([
			shouldWarn
				? warn(member, "Watch your language!", censored.strikes, member.displayName)
				: member
						.send(
							`${CONSTANTS.emojis.statuses.no} I censored some bad words in your username. If you change your nickname to include bad words, you may be warned.`,
						)
						.catch(() => {}),
			setNickname(member, pingablify(censored.censored)),
		]);
	}

	const pingablified = pingablify(member.displayName);

	if (pingablified !== member.displayName) {
		await Promise.all([
			setNickname(member, pingablified),
			member
				.send(
					`⚠ For your information, I automatically removed non-easily-pingable characters from your nickname to comply with rule ${NICKNAME_RULE}. You may change it to something else that’s easily typable on American English keyboards if you dislike what I chose.`,
				)
				.catch(() => {}),
		]);

		return;
	}

	const members = (
		await CONSTANTS.guild.members.fetch({
			query: member.displayName,
			limit: 100,
		})
	).filter((found) => found.displayName === member.displayName);

	/** @type {any[]} */
	const promises = [];

	if (members.size > 1) {
		const [safe, unsafe] = members.partition(
			(found) => found.user.username === member.displayName,
		);

		if (safe.size > 0) {
			promises.push(
				...unsafe
					.map((found) => [
						setNickname(found, found.user.username),

						found
							.send(
								`⚠ Your nickname conflicted with someone else’s nickname, so I unfortunately had to change it to comply with rule ${NICKNAME_RULE}.`,
							)
							.catch(() => {}),
					])
					.flat(),
			);

			if (safe.size > 1) {
				promises.push(
					CONSTANTS.channels.modlogs?.send({
						allowedMentions: { users: [] },
						content: `⚠ Conflicting nicknames: ${joinWithAnd(safe.toJSON())}.`,
					}),
				);
			}
		} else if (
			unsafe.size > 1 &&
			unsafe.has(member.id) &&
			(await setNickname(member, member.user.username))
		) {
			unsafe.delete(member.id);
		}

		if (unsafe.size > 1) {
			promises.push(
				CONSTANTS.channels.modlogs?.send({
					allowedMentions: { users: [] },
					content: `⚠ Conflicting nicknames: ${joinWithAnd(unsafe.toJSON())}.`,
				}),
			);
		}
	}

	await Promise.all(promises);
}
