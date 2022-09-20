import { Invite, cleanContent, FormattingPatterns } from "discord.js";
import CONSTANTS from "../CONSTANTS.js";
import fetch from "node-fetch";
import warn from "./warns.js";
import { stripMarkdown } from "../../lib/markdown.js";
import { caesar, joinWithAnd, pingablify, normalize } from "../../lib/text.js";
import client, { guild } from "../../client.js";
import { getBaseChannel } from "../../lib/discord.js";
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
			/ahqr/,
			/grfgvpyr/,
			/fpuzhpx/,
			/ohgg(?:[ -]?cvengr)/,
			/ohgg(?:[ -]?jvcr)/,
			/qvyqb/,
			/erpghz/,
			/ihyin/,
			/🖕/,
			/卐/,
			/卍/,
			/lvss/,
		],
		[
			/intva(?:n|r|y|f|l)+/,
			/cravf(?:rf)?/,
			/nahf(?:rf)?/,
			/frzra/,
			/(?:c(?:er|bfg)[ -]?)?phz/,
			/pyvg/,
			/phagf?/,
			/frk/,
			/grrgf?/,
			/gvg(?:(?:gvr)?f)?/,
			/obbo(?:(?:ovr)?f)?/,
		],
	],
	[
		[
			/fuvg(?!nx(?:v|r))/,
			/fpurvffr/,
			/puvat[ -]?(punat[ -]?)?puba/,
			/nefpuybpu/,
			/rwnphyngr/,
			/fcyb+tr/,
			/fcurapgre/,
			/fjnfgvxn/,
			/fpunssre/,
			/obyybpx/,
			/oybj[ -]?wbo/,
			/shpx/,
			/svpx/,
			/wvfz/,
			/wvmm/,
			/xvxr/,
			/xhxfhtre/,
			/znfg(?:h|r)eong/,
			/ahg[ -]?fnpx/,
			/cnxl/,
			/cbynpx/,
			/dhrrs/,
			/wnpx[ -]?bss/,
			/wrex[ -]?bss/,
			/ov?gpu/,
		],
		[
			/fubeg[ -]?nefr/,
			/fzneg[ -]?nefr/,
			/nefryvpx(?:vat|ref?)?/,
			/fzhg+(?:vr|e|fg?|l)?/,
			/(?:(?:onq|sng|wnpx|wvir|xvpx|ynzc|yneq|gvtug|jvfr|fzneg|qhzo)[ -]?)?n(?:ff|efr)(?:[ -]?(?:pybja|snpr|ung|ubyr|ybnq|enz(?:z(?:re)?(?:vat)?)?|jvcr)f?|r(?:el|fq?))?/,
			/vawhaf?/,
			/pbpx(?:[ -]?svtug|fhpx|(?:svtug|fhpx)(?:re|vat)|znafuvc|hc)?f?/,
			/gjng+(?:y?rq|yre?|y?vat|f|vrf?|l)?/,
			/fcvpf?/,
			/yrfobf?/,
			/obbo+(?:v(?:r|rf|at)|f|l)?/,
			/(?:ovt[ -]?)?qvpxr?(?:[ -]?(?:q|l|evat|ef?|urnqf?|vre?|vrfg?|vat|f|jnqf?|loveqf?))?/,
			/tbbx(?:f|l)?/,
			/urzv[ -]?cravf/,
			/onfgneq(?:vfz|(y|e)?l|evrf|f)?/,
			/cnp?x(?:vr|l)?vf?/,
		],
	],
	[
		[
			/pnecrg[ -]?zhapure/,
			/fyhg/,
			/fur[ -]?znyr/,
			/yrmmvn/,
			/qbzvangevk/,
			/shqtr[ -]?cnpxr/,
			/jrg[ -]?onp/,
			/ergneq/,
		],
		[
			/j?uber/,
			/av+t+(?:(r|h)?e|n)(?:[ -]?rq|qbz|urnq|vat|vf(u|z)|yvat|l)?f?/,
			/snv?t+(?:rq|vr(?:e|fg)|va|vg|bgf?|bge?l|l)f?/,
			/wnc(?:rq?|revrf|re?f|rel?|r?f|vatf?|crq|cvat)?/,
			/jnax(?:v?ref?|v(?:rfg|at)|yr|f|l)?/,
		],
	],
];

if (process.env.NODE_ENV !== "production") badWords[1]?.[0].push(/automodmute/);

/** @param {RegExp[]} regexes */
function decodeRegexes(regexes) {
	return regexes
		.map(({ source }) =>
			caesar(source).replaceAll(
				/[ouetsialh]/gi,
				(letter) =>
					({
						a: "[*@a]",
						e: "[*3e]",
						h: "[#h]",
						i: "[!*1i¡l|]",
						l: "[!1i¡l|]",
						o: "[*0o]",
						s: "[$5s]",
						t: "[+t]",
						u: "[*uv]",
					}[letter] || letter),
			),
		)
		.join("|");
}
const badWordRegexps = badWords.map(
	([strings, words]) =>
		new RegExp(decodeRegexes(strings) + "|\\b(?:" + decodeRegexes(words) + ")\\b", "gi"),
);

/** @param {string} text */
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

	return words.flat().length
		? {
				censored,
				strikes: words.reduce((acc, curr, index) => curr.length * index + acc, 0),
				words,
		  }
		: false;
}

/**
 * @param {string} toCensor
 * @param {import("discord.js").Message | import("discord.js").PartialMessage} message
 */
async function checkString(toCensor, message) {
	/** @type {{ language: false | number; invites: false | number; bots: false | number }} */
	const bad = { language: false, invites: false, bots: false };
	if (!badWordsAllowed(message.channel)) {
		const censored = censor(toCensor);
		if (censored) {
			bad.language = censored.strikes;
		}
	}

	if (
		![
			guild?.rulesChannel?.id,
			"806605043817644074", // announcements
			"874743757210275860", // scratch-servers
			CONSTANTS.channels.mod?.id,
			CONSTANTS.channels.modlogs?.id,
			CONSTANTS.channels.admin?.id,
			CONSTANTS.channels.modmail?.id,
			CONSTANTS.channels.advertise?.id,
			undefined,
		].includes(getBaseChannel(message.channel)?.id) &&
		!message.author?.bot
	) {
		const botLinks = toCensor.match(/discord(?:app)?\.com\/(api\/)?oauth2\/authorize/gi);
		if (botLinks) {
			bad.bots = botLinks.length;
		}

		/** A global regular expression variant of {@link Invite.InvitesPattern}. */
		const GlobalInvitesPattern = new RegExp(Invite.InvitesPattern.source, "g");

		const inviteCodes = toCensor.match(GlobalInvitesPattern);

		if (inviteCodes) {
			const invitesToDelete = (
				await Promise.all(
					inviteCodes.map(async (code) => {
						const invite = await client?.fetchInvite(code).catch(() => {});
						return invite?.guild?.id === message.guild?.id;
					}),
				)
			).filter(/** @returns {toWarn is true} */ (toWarn) => !toWarn).length;

			if (invitesToDelete) {
				bad.invites = invitesToDelete;
			}
		}
	}

	return bad;
}

/** @param {import("discord.js").Message} message */
export async function automodMessage(message) {
	const bad = (
		await Promise.all([
			checkString(stripMarkdown(message.content), message).then((info) => ({
				...info,
				words: {
					language: typeof info.language === "number" ? [message.content] : [],
					invites: typeof info.invites === "number" ? [message.content] : [],
					bots: typeof info.bots === "number" ? [message.content] : [],
				},
			})),

			badAttachments(message),
		])
	).reduce(
		(bad, censored) => {
			return {
				language:
					typeof censored.language === "number"
						? +bad.language + censored.language
						: bad.language,

				invites:
					typeof censored.invites === "number"
						? +bad.invites + censored.invites
						: bad.invites,

				bots: typeof censored.bots === "number" ? +bad.bots + censored.bots : bad.bots,
				words: {
					language: [...censored.words.language, ...bad.words.language],
					invites: [...censored.words.invites, ...bad.words.invites],
					bots: [...censored.words.bots, ...bad.words.bots],
				},
			};
		},
		{
			language: false,
			invites: false,
			bots: false,
			words: { language: [], invites: [], bots: [] },
		},
	);
	const stickerRating = await badStickers(message);
	if (stickerRating.strikes) {
		bad.words.language.push(...stickerRating.words);
		bad.language = (bad.language || 0) + stickerRating.strikes;
	}
	const toStrike = [bad.language, bad.invites, bad.bots].filter(
		/** @returns {strikes is false} */ (strikes) => strikes !== false,
	);
	const embedStrikes = badWordsAllowed(message.channel)
		? false
		: message.embeds
				.map((embed) => [
					embed.description && cleanContent(embed.description, message.channel),
					embed.title,
					embed.url,
					embed.image?.url,
					embed.thumbnail?.url,
					embed.footer?.text,
					embed.author?.name,
					embed.author?.url,
					...embed.fields.map((field) => [field.name, field.value]).flat(),
				])
				.flat()
				.reduce((strikes, current) => {
					const censored = current && censor(current);
					if (censored) {
						bad.words.language.push(...censored.words.flat());
					}
					return censored ? +strikes + censored.strikes : strikes;
				}, /** @type {number | false} */ (false));
	if (typeof embedStrikes === "number") {
		bad.language = (bad.language || 0) + embedStrikes;
	}

	const promises = [];
	if (toStrike.length) promises.push(message.delete());
	else if (typeof embedStrikes === "number") promises.push(message.suppressEmbeds());

	if (typeof bad.language === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Watch your language!",
				bad.language,
				"Sent message with words:\n" + bad.words.language.join("\n"),
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(message.interaction?.user || message.author).toString()}, language!`,
			),
		);
	}
	if (typeof bad.invites === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Please don’t send server invites in that channel!",
				bad.invites,
				bad.words.invites.join("\n"),
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, only post invite links in ${CONSTANTS.channels.advertise?.toString()}!`,
			),
		);
	}

	/** A global regular expression variant of {@link FormattingPatterns.AnimatedEmoji}. */
	const GlobalAnimatedEmoji = new RegExp(FormattingPatterns.AnimatedEmoji.source, "g");

	const animatedEmojiCount = [...message.content.matchAll(GlobalAnimatedEmoji)].length;

	const badAnimatedEmojis = animatedEmojiCount > 9 ? Math.round(animatedEmojiCount / 15) : false;

	if (
		getBaseChannel(message.channel)?.id !== CONSTANTS.channels.bots?.id &&
		typeof badAnimatedEmojis === "number"
	) {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				`Please don’t post that many animated emojis!`,
				+badAnimatedEmojis,
				message.content,
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, lay off on the animated emojis please!`,
			),
		);
	}
	if (typeof bad.bots === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Please don’t post bot invite links!",
				bad.bots,
				bad.words.bots.join("\n"),
			),
			message.channel.send(
				CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, bot invites go to ${CONSTANTS.channels.advertise?.toString()}!`,
			),
		);
	}

	await Promise.all(promises);

	return toStrike.length > 0;
}
/** @param {import("discord.js").TextBasedChannel | null} channel */
export function badWordsAllowed(channel) {
	return [
		CONSTANTS.channels.mod?.id,
		CONSTANTS.channels.modlogs?.id,
		CONSTANTS.channels.admin?.id,
		CONSTANTS.channels.modmail?.id,
		CONSTANTS.channels.devs?.id || "",
		CONSTANTS.channels.boosters?.id || "",
		CONSTANTS.channels.youTube?.id || "",
		undefined,
	].includes(getBaseChannel(channel)?.id);
}

/** @param {import("discord.js").Message | import("discord.js").PartialMessage} message */
export async function badAttachments(message) {
	const censorString = async (/** @type {string} */ string) => await checkString(string, message);

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

	await Promise.all(
		message.attachments.map(async (attachment) => {
			if (attachment.name) {
				const censored = await censorString(attachment.name);
				if (censored) {
					if (typeof censored.language === "number") {
						bad.language = (bad.language || 0) + censored.language;
						bad.words.language.push(attachment.name);
					}

					if (typeof censored.invites === "number") {
						bad.invites = (bad.invites || 0) + censored.invites;
						bad.words.invites.push(attachment.name);
					}

					if (typeof censored.bots === "number") {
						bad.bots = (bad.bots || 0) + censored.bots;
						bad.words.bots.push(attachment.name);
					}
				}
			}
			if (attachment.description) {
				const censored = await censorString(attachment.description);
				if (censored) {
					if (typeof censored.language === "number") {
						bad.language = (bad.language || 0) + censored.language;
						bad.words.language.push(attachment.description);
					}

					if (typeof censored.invites === "number") {
						bad.invites = (bad.invites || 0) + censored.invites;
						bad.words.invites.push(attachment.description);
					}

					if (typeof censored.bots === "number") {
						bad.bots = (bad.bots || 0) + censored.bots;
						bad.words.bots.push(attachment.description);
					}
				}
			}
			if (
				attachment.contentType?.startsWith("text/") ||
				["application/json", "application/xml", "application/rss+xml"].includes(
					attachment.contentType || "",
				)
			) {
				const content = await fetch(attachment.url).then((res) => res.text());
				const censored = await censorString(content);
				if (censored) {
					if (typeof censored.language === "number") {
						bad.language = (bad.language || 0) + censored.language;
						bad.words.language.push(content);
					}

					if (typeof censored.invites === "number") {
						bad.invites = (bad.invites || 0) + censored.invites;
						bad.words.invites.push(content);
					}

					if (typeof censored.bots === "number") {
						bad.bots = (bad.bots || 0) + censored.bots;
						bad.words.bots.push(content);
					}
				}
			}
		}),
	);

	return bad;
}

/** @param {import("discord.js").Message | import("discord.js").PartialMessage} message */
export async function badStickers(message) {
	/** @type {{ strikes: false | number; words: string[] }} */
	const bad = { strikes: false, words: [] };

	await Promise.all(
		message.stickers.map(async ({ name }) => {
			const censored = await checkString(name, message);
			if (typeof censored.language === "number") {
				bad.strikes = (bad.strikes || 0) + censored.language;
				bad.words.push(name);
			}
		}),
	);

	return bad;
}

const NICKNAME_RULE = 7;

/** @param {import("discord.js").GuildMember} member */
export async function changeNickname(member, strike = true) {
	const censored = censor(member.displayName);
	if (censored) {
		await Promise.all([
			strike
				? warn(member, "Watch your language!", censored.strikes, member.displayName)
				: member
						.send(
							CONSTANTS.emojis.statuses.no +
								" I censored some bad words in your username. If you change your nickname to include bad words, you may be warned.",
						)
						.catch(() => {}),
			setNickname(member, pingablify(censored.censored)),
			removeDuplicateNicknames(member),
		]);
		return;
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
			removeDuplicateNicknames(member),
		]);
		return;
	}
	await removeDuplicateNicknames(member, true);
}

/** @param {import("discord.js").GuildMember} member */
async function removeDuplicateNicknames(member, dm = false) {
	const members = (await guild.members.fetch({ query: member.displayName, limit: 100 })).filter(
		(found) => found.displayName === member.displayName,
	);

	/** @type {any[]} */
	const promises = [];
	if (members.size > 1) {
		const [safe, unsafe] = members.partition(
			(found) => found.user.username === member.displayName,
		);

		if (safe.size) {
			promises.push(
				...unsafe
					.map((found) => [
						setNickname(found, found.user.username),
						dm &&
							found
								.send(
									`⚠ Your nickname conflicted with someone else’s nickname, so I unfortunately had to change it to comply with rule ${NICKNAME_RULE}.`,
								)
								.catch(() => false),
					])
					.flat(),
			);
			if (safe.size > 1) {
				promises.push(
					CONSTANTS.channels.mod?.send({
						allowedMentions: { users: [] },
						content: `⚠ Conflicting nicknames: ${joinWithAnd(safe.toJSON())}.`,
					}),
				);
			}
		} else if (unsafe.size > 1) {
			if (unsafe.has(member.id)) {
				(await setNickname(member, member.user.username)) && unsafe.delete(member.id);
			}
			if (unsafe.size > 1)
				promises.push(
					CONSTANTS.channels.mod?.send({
						allowedMentions: { users: [] },
						content: `⚠ Conflicting nicknames: ${joinWithAnd(unsafe.toJSON())}.`,
					}),
				);
		}
	}
	await Promise.all(promises);
}

/**
 * @param {import("discord.js").GuildMember} member
 * @param {string} newNickname
 */
async function setNickname(member, newNickname) {
	if (member.nickname === newNickname) return member;
	if (member.moderatable) return await member.setNickname(newNickname);
	await CONSTANTS.channels.mod?.send({
		allowedMentions: { users: [] },
		content: `⚠ Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\`.`,
	});
	return false;
}
