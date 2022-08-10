import { Invite, Util } from "discord.js";
import CONSTANTS from "../CONSTANTS.js";
import fetch from "node-fetch";
import warn from "./warns.js";
import { stripMarkdown } from "../../lib/markdown.js";
import { caesar, joinWithAnd, pingablify, normalize } from "../../lib/text.js";
export const regexps = [
	// Just Delete
	/c[*0b]ea|a[*hi]q[*3r]|[+g][*3r][$5f][+g][!*1v¡][(<p](?:[*@n][y|]|[y|][*3r])|[$5f](?:[(<p][#u]z[*hi][(<p]x)|o[*hi][+g]{1,2}(?:[ -]?c[!*1v¡]e[*@n][+g][*3r]|j[!*1v¡]c[*3r])|q[!*1v¡][y|]{1,2}q[*0b]|e[*3r][(<p][+g][*hi]z|i(?:[*@n]t[!*1v¡]a[*@n][y|]|[*hi][y|]i[*@n])|(?<![a-z0-9])(?:i[*@n]t[!*1v¡]a[*@n](?:[$*35ryf|]|yl)?|c[*3r]a[!*1v¡][$5f](?:[*3r][$5f])?|[*@n]a[*hi][$5f](?:[*3r][$5f])?|(?:oe[*3r][*@n][$5f][+g]|[$5f][*3r]z[*3r]a|[(<p](?:[*hi]z|[y|][!*1v¡][+g])|[+g][*3r]{2}[+g])[$5f]?)(?![a-z0-9])|🖕/gi,
	// 1 Strike
	/[f$][#u][v¡1!*][+g]|(?<![a-z0-9])(?:(?:(?:[$5f][#u][*0b]e[+g]|[$5f]z[*@n]e[+g])[ -]?)?[*@n]e[$5f][*3r](?:[$5qfl]|[#u][*0b][y|][*3r][$5qf]?|[y|][!*1v¡][(<p]x(?:[*3r]e[$5f]?|[!*1v¡]at))?|c[!*1v¡][$5f]{2}(?:[ -]?[*hi]c[$5f]?|[*3r][$5qf]|[*3r]e[$5f]?|[#u](?:[*3r][*@n]q|[*0b][y|][*3r])[$5f]?|[!*1v¡][*3r]e|[!*1v¡]at|c[*0b]{2}e|c[*0b][+g][$5f]?|[+g][*@n]x[*3r][$5f]?|[+g][*@n]x[!*1v¡]at|l)?|[$5f]z[*hi][+g]{1,2}(?:[!*1v¡][*3r](?:e|[$5f][+g])|[$5fl])?|(?:(?:o[*@n]q|s[*@n][+g]|w[*@n][(<p]x|w[!*1v¡]i[*3r]|x[!*1v¡][(<p]x|[y|][*@n](?:zc|eq)|[+g][!*1v¡]t[#u][+g]|j[!*1v¡][$5f][*3r]|[$5f][#uz][*@n]e[+g]|q[*hi][#uz]o)[ -]?)?[*@n][$5f]{2}(?:[ -]?(?:[(<p][y|][*0b]ja|s[*@n][(<p][*3r]|[#u][*@n][+g]|[#u][*0b][y|][*3r]|[y|][*0b][*@n]q|e[*@n]z(?:z(?:[*3r]e)?(?:[!*1v¡]at)?)?|j[!*1v¡]c[*3r])[$5f]?|[*3r](?:el|[$5f]q?))?|[!*1v¡]aw[*hi]a[$5f]?|[(<p][*0b][(<p]x(?:[ -]?s[!*1v¡]t[#u][+g]|[$5f][*hi][(<p]x|(?:s[!*1v¡]t[#u][+g]|[$5f][*hi][(<p]x)(?:[*3r]e|[!*1v¡]at)|z[*@n]a[$5f][#u][!*1v¡]c|[*hi]c)?[$5f]?|[+g](?:j[*@n][+g]+(?:[*3r]q|[!*1v¡]at|[y|][*3r]|[y|][*3r]q|[y|][*3r]e|[y|][!*1v¡]at|[$5f])?[$5f]|[!*1v¡][+g](?:[!*1v¡][*3r]|[!*1v¡][*3r][$5f]|[$+5fg]|[+g]l)?)|[$5f]c[!*1v¡][(<p][$5f]?|[y|][*3r][$5f]o[*0b][$5f]?|o[*0b]{2}o(?:[!*1v¡](?:[*3r]|[*3r][$5f]|at)|[$5fl])?|(o[!*1v¡]t[ -]?)?q[!*1v¡][(<p]x[*3r]?(?:[ -]?[*3r][qel]|[*3r]e[!*1v¡]at|[*3r]e[$5f]|[#u][*3r][*@n]q|[#u][*3r][*@n]q[$5f]|[!*1v¡][*3r]|[!*1v¡][*3r][%4ef]|[!*1v¡][*3r][$5f][+g]|[!*1v¡]at|[$5fl]|j[*@n]q|j[*@n]q[$5f]|lo[!*1v¡]eq|lo[!*1v¡]eq[$5f])?|t[*0b]{2}x[$5fl]?|[#u][*3r]z[!*1v¡][ -]?c[*3r]a[!*1v¡][$5f]|c(?:[*@n](?:[(<p]?x(?:[!*1v¡][*3r]|l)|[*@n]x[!*1v¡])[$5f]?|[*3r](?:[(<p]x[*3r]e[$5f]?|a[!*1v¡][$5f][ -]?oe[*3r][*@n][+g][#u]))|j[*0b]c(?:[!*1v¡]at|[$5f])?)(?![a-z0-9])|[(<p][#u][!*1v¡]at[ -]?[(<p][#u][*0b]at|[(<px][*hi]?a[+g][$5f]?|[*@n]e[$5f][(<p][#u][y|][*0b][(<p][#u]|[*3r]w[*@n](?:[(<px]|[(<p]x)[*hi][y|][*@n][+g][*3r]|[$5f](?:c[y|][*0b]{2}t[*3r]|c[#u][*3r]a[(<p][+g][*3r]e|j[*@n][$5f][+g][!*1v¡]x[*@n]|卐|卍|[(<p][#u][*@n]ss[*3r]e)|o(?:[*0b][y|]{2}[*0b][(<p]x|[y|][*0b]j[ -]?w[*0b]o)|s(?:[*@n]aal|[*hi][(<p]?x)|w[!*1v¡][$5fm][zm]|x(?:[!*1v¡]x[*3r]|[*hi]x[$5f][*hi]t[*3r]e)|z[*@n][$5f]{1,2}[+g][*3rhi]?eo[*@n][+g]|a[*hi][+g][ -]?[$5f][*@n][(<p]x|c(?:[*@n]xl|(?:[*hi]{2}|[*0b][y|][*@n][(<p]?)x)|d[*hi][*3r]{2}s|(?:w[*@n][(<p]x|w[*3r]ex)[ -]?[*0b]ss/gi,
	// 2 Strikes
	/o[!*1v¡]?[+g][(<p][#u]|(?<![a-z0-9])(?:a[!*1v¡]+tt(?:[*3rhi]?e|[*@n])(?:[ -]?[*3r]q|q[*0b]z|[#u][*3r][*@n]q|[!*1v¡]at|[!*1v¡][$5f][#uz]|y[!*1v¡]at|l)?[$5f]?|o[*@n][$5f][+g][*@n]eq(?:[!*1v¡][$5f]z|[ye|]l|e[!*1v¡][*3r][$5f]|[$5fl])?)|(?:s[*@n][!*1v¡]?tt?(?:[*3r]q|[!*1v¡][*3r](?:e|[$5f][+g])|[!*1v¡][+ag]|[*0b][+g][$5fl]|[*0b][+g]|[*0b][+g]el|l)?[$5f]?|w[*@n]c(?:[$*35rf]|[*3r]q|[*3r]e|[*3r]e[!*1v¡][*3r][$5f]|[*3r]e[$5f]|[*3r]el|[*3r][$5f]|[!*1v¡]at|[!*1v¡]at[$5f]|c[*3r]q|c[!*1v¡]at)?|j[*@n]ax(?:[!*1v¡]?[*3r]e[$5f]?|[!*1v¡](?:[*3r][$5f][+g]|at)|y[*3r]|[$5fl])?)(?![a-z0-9])|[(<p][*@n]ec[*3r][+g][ -]?z[*hi]a[(<p][#u][*3r]e|[$5f](?:[y|][*hi][+g]|[#u][*3r][ -]?z[*@n][y|][*3r])|[y|][*3r]mm[!*1v¡][*@n]|q[*0b]z[!*1v¡]a[*@n][+g]e[!*1v¡]|s[*hi]qt[*3r][ -]?c[*@n][(<p]x[*3r]|[#u][*0bhi]ax[*3r]?|j?[#u][*0b]e[*3r]|j[*3r][+g][ -]?o[*@n][(<p]/gi,
];

/** @param {string} text */
export function censor(text) {
	/** @type {string[][]} */
	const words = [];
	const censored = caesar(
		regexps.reduce((string, regexp, index) => {
			words[index] ??= [];
			return string.replaceAll(regexp, (censored) => {
				words[index]?.push(caesar(censored));
				return "#".repeat(censored.length);
			});
		}, caesar(normalize(text))),
	);

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
	/**
	 * @type {{
	 * 	language: false | number;
	 * 	invites: false | number;
	 * 	bots: false | number;
	 * }}
	 */
	let bad = {
		language: false,
		invites: false,
		bots: false,
	};
	if (!badWordsAllowed(message.channel)) {
		const censored = censor(toCensor);
		if (censored) {
			bad.language = censored.strikes;
		}
	}

	if (
		![
			message.guild?.rulesChannel?.id,
			"806605043817644074",
			"874743757210275860",
			"816329956074061867",
			message.guild?.publicUpdatesChannel?.id,
			process.env.LOGS_CHANNEL,
			process.env.MODMAIL_CHANNEL,
			"806624037224185886",
		].includes((message.channel.isThread() && message.channel.parent?.id) || message.channel.id)
	) {
		const botLinks = toCensor.match(/discord(?:app)?\.com\/(api\/)?oauth2\/authorize/gi);
		if (botLinks) {
			bad.bots = botLinks.length;
		}

		const inviteCodes = toCensor.match(Invite.INVITES_PATTERN);
		if (inviteCodes) {
			const invitesToDelete = [
				...new Set(
					(
						await Promise.all(
							inviteCodes.map(async (code) => {
								const invite = await message.client
									?.fetchInvite(code)
									.catch(() => {});
								if (!invite) return [];
								if (!invite.guild) return [code];
								if (invite.guild?.id === message.guild?.id) return [];
								return [invite.guild?.id];
							}),
						)
					).flat(),
				),
			].length;

			if (invitesToDelete) {
				bad.invites = invitesToDelete;
			}
		}
	}

	return bad;
}

/** @param {import("discord.js").Message} message */
export async function automodMessage(message) {
	let bad = (
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
	const toStrike = [bad.language, bad.invites, bad.bots].filter((strikes) => strikes !== false);
	const embedStrikes = badWordsAllowed(message.channel)
		? false
		: message.embeds
				.map((embed) => [
					embed.description && Util.cleanContent(embed.description, message.channel),
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
			message.channel.send({
				content:
					CONSTANTS.emojis.statuses.no +
					` ${(message.interaction?.user || message.author).toString()}, language!`,
			}),
		);
	}
	if (typeof bad.invites === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Please don't send server invites in that channel!",
				bad.invites,
				bad.words.invites.join("\n"),
			),
			message.channel.send({
				content:
					CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, only post invite links in <#806624037224185886>!`,
			}),
		);
	}

	const animatedEmojiCount =
		(message.content && message.content.match(/<a:.+?:\d+>/gi)?.length) || 0;

	const badAnimatedEmojis = animatedEmojiCount > 9 ? Math.round(animatedEmojiCount / 15) : false;

	if (
		((message.channel.isThread() && message.channel.parent?.id) || message.channel.id) ===
			process.env.BOTS_CHANNEL &&
		typeof badAnimatedEmojis === "number"
	) {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				`Please don\'t post that many animated emojis!`,
				+badAnimatedEmojis,
				message.content,
			),
			message.channel.send({
				content:
					CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, lay off on the animated emojis please!`,
			}),
		);
	}
	if (typeof bad.bots === "number") {
		promises.push(
			warn(
				message.interaction?.user || message.author,
				"Please don't post bot invite links!",
				bad.bots,
				bad.words.bots.join("\n"),
			),
			message.channel.send({
				content:
					CONSTANTS.emojis.statuses.no +
					` ${(
						message.interaction?.user || message.author
					).toString()}, bot invites go to <#806624037224185886>!`,
			}),
		);
	}

	await Promise.all(promises);

	return toStrike.length > 0;
}
/** @param {import("discord.js").TextBasedChannel | null} channel */
export function badWordsAllowed(channel) {
	if (!channel || channel.type === "DM") return true;
	return [
		"816329956074061867", // admin-talk
		channel.guild.publicUpdatesChannel?.id, // mod-talk
		process.env.LOGS_CHANNEL, // mod-logs
		process.env.MODMAIL_CHANNEL, // scradd-mail
		"853256939089559583",
		"894314668317880321",
		"869662117651955802",
	].includes((channel.isThread() && channel.parent?.id) || channel.id);
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
	let bad = {
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
	/**
	 * @type {{
	 * 	strikes: false | number;
	 * 	words: string[];
	 * }}
	 */
	let bad = {
		strikes: false,
		words: [],
	};

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
						.send({
							content:
								CONSTANTS.emojis.statuses.no +
								" I censored some bad words in your username. If you change your nickname to include bad words, you may be warned.",
						})
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
				.send({
					content: `For your information, I automatically removed non-easily-pingable characters from your nickname to comply with rule ${NICKNAME_RULE}. You may change it to something else that is easily typable on American English keyboards if you dislike what I chose.`,
				})
				.catch(() => {}),
			removeDuplicateNicknames(member),
		]);
		return;
	}
	await removeDuplicateNicknames(member, true);
}

/** @param {import("discord.js").GuildMember} member */
async function removeDuplicateNicknames(member, dm = false) {
	const members = (
		await member.guild.members.fetch({ query: member.displayName, limit: 100 })
	).filter((found) => found.displayName === member.displayName);

	/** @type {any[]} */
	const promises = [];
	if (members.size > 1) {
		const [safe, unsafe] = members.partition(
			(found) => found.user.username === member.displayName,
		);

		const modTalk = member.guild.publicUpdatesChannel;
		if (!modTalk) throw new ReferenceError("Could not find mod talk");
		if (safe.size) {
			promises.push(
				...unsafe
					.map((found) => [
						setNickname(found, found.user.username),
						dm &&
							found
								.send(
									`Your nickname conflicted with someone else's nickname, so I unfortunately had to change it to comply with rule ${NICKNAME_RULE}.`,
								)
								.catch(() => false),
					])
					.flat(),
			);
			if (safe.size > 1) {
				promises.push(
					modTalk.send({
						allowedMentions: { users: [] },
						content: `Conflicting nicknames: ${joinWithAnd(safe.toJSON())}.`,
					}),
				);
			}
		} else if (unsafe.size > 1) {
			if (unsafe.has(member.id)) {
				(await setNickname(member, member.user.username)) && unsafe.delete(member.id);
			}
			if (unsafe.size > 1)
				promises.push(
					modTalk.send({
						allowedMentions: { users: [] },
						content: `Conflicting nicknames: ${joinWithAnd(unsafe.toJSON())}.`,
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
	const modTalk = member.guild.publicUpdatesChannel;
	if (!modTalk) throw new ReferenceError("Could not find mod talk");
	await modTalk.send({
		allowedMentions: { users: [] },
		content: `Missing permissions to change ${member.toString()}'s nickname to \`${newNickname}\`.`,
	});
	return false;
}
