import { GuildTemplate, Invite } from "discord.js";
import CONSTANTS from "../CONSTANTS.js";
import { firstPromiseValued } from "../../lib/promises.js";
import fetch from "node-fetch";
import warn from "./warns.js";
import { stripMarkdown } from "../../lib/markdown.js";
const regexps = [
	// Just Delete
	/[+g][*3r][$5f][+g][!*1v][(<p](?:[*@n][y|]|[y|][*3r])|[$5f](?:[(<p][#u]z[*h][(<p]x|[*@n]q[!*1v][$5f][+g])|o[*h][+g]{1,2}(?:[ -]?c[!*1v]e[*@n][+g][*3r]|j[!*1v]c[*3r])|q[!*1v][y|]{1,2}q[*0b]|e[*3r][(<p][+g][*h]z|i(?:[*@n]t[!*1v]a[*@n][y|]|[*h][y|]i[*@n])|(?<![a-z])(?:i[*@n]t[!*1v]a[*@n](?:[$*35ryf|]|yl)?|c[*3r]a[!*1v][$5f](?:[*3r][$5f])?|[*@n]a[*h][$5f](?:[*3r][$5f])?|(?:oe[*3r][*@n][$5f][+g]|[$5f][*3r]z[*3r]a|[(<p](?:[*h]z|[y|][!*1v][+g])|[+g][*3r]{2}[+g])[$5f]?)(?![a-z])|🖕/gi,
	// 1 Strike
	/[f$][#u][v1!*][+g]|(?<![a-z])(?:(?:(?:o[*@n]q|s[*@n][+g]|w[*@n][(<p]x|w[!*1v]i[*3r]|x[!*1v][(<p]x|[y|][*@n](?:zc|eq)|[+g][!*1v]t[#u][+g]|j[!*1v][$5f][*3r])[ -]?)?[*@n][$5f]{2}(?:[ -]?(?:[(<p][y|][*0b]ja|s[*@n][(<p][*3r]|[#u][*@n][+g]|[#u][*0b][y|][*3r]|[y|][*0b][*@n]q|e[*@n]z(?:z(?:[*3r]e)?(?:[!*1v]at)?)?|j[!*1v]c[*3r])[$5f]?|[*3r](?:el|[$5f]q?))?|[!*1v]aw[*h]a[$5f]?|[(<p][*0b][(<p]?x(?:[ -]?s[!*1v]t[#u][+g]|[$5f][*h][(<p]x|(?:s[!*1v]t[#u][+g]|[$5f][*h][(<p]x)(?:[*3r]e|[!*1v]at)|z[*@n]a[$5f][#u][!*1v]c|[*h]c)?[$5f]?|[+g](?:j[*@n][+g]+(?:[*3r]q|[!*1v]at|[y|][*3r]|[y|][*3r]q|[y|][*3r]e|[y|][!*1v]at|[$5f])?[$5f]|[!*1v][+g](?:[!*1v][*3r]|[!*1v][*3r][$5f]|[$+5fg]|[+g]l)?)|[$5f]c[!*1v][(<p][$5f]?|[y|][*3r][$5f]o[*0b][$5f]?|o[*0b]{2}o(?:[!*1v](?:[*3r]|[*3r][$5f]|at)|[$5fl])?|(o[!*1v]t[ -]?)?q[!*1v][(<p]x[*3r]?(?:[ -]?[*3r][qel]|[*3r]e[!*1v]at|[*3r]e[$5f]|[#u][*3r][*@n]q|[#u][*3r][*@n]q[$5f]|[!*1v][*3r]|[!*1v][*3r][%4ef]|[!*1v][*3r][$5f][+g]|[!*1v]at|[$5fl]|j[*@n]q|j[*@n]q[$5f]|lo[!*1v]eq|lo[!*1v]eq[$5f])?|t[*0b]{2}x[$5fl]?|[#u][*3r]z[!*1v][ -]?c[*3r]a[!*1v][$5f]|c(?:[*@n](?:[(<p]?x(?:[!*1v][*3r]|l)|[*@n]x[!*1v])[$5f]?|[*3r](?:[(<p]x[*3r]e[$5f]?|a[!*1v][$5f][ -]?oe[*3r][*@n][+g][#u]))|j[*0b]c(?:[!*1v]at|[$5f])?|(?:(?:[$5f][#u][*0b]e[+g]|[$5f]z[*@n]e[+g])[ -]?)?[*@n]e[$5f][*3r](?:[$5qfl]|[#u][*0b][y|][*3r][$5qf]?|[y|][!*1v][(<p]x(?:[*3r]e[$5f]?|[!*1v]at))?)(?![a-z])|[(<p][#u][!*1v]at[ -]?[(<p][#u][*0b]at|[(<px][*h]?a[+g][$5f]?|[*@n]e[$5f][(<p][#u][y|][*0b][(<p][#u]|[*3r]w[*@n](?:[(<px]|[(<p]x)[*h][y|][*@n][+g][*3r]|[$5f](?:c[y|][*0b]{2}t[*3r]|c[#u][*3r]a[(<p][+g][*3r]e|j[*@n][$5f][+g][!*1v]x[*@n]|卐|卍|[(<p][#u][*@n]ss[*3r]e)|o(?:[*0b][y|]{2}[*0b][(<p]x|[y|][*0b]j[ -]?w[*0b]o)|s(?:[*@n]aal|[*h][(<p]?x)|t[*0b]q[ -]?q[*@n]za|w[!*1v][$5fm][zm]|x(?:[!*1v]x[*3r]|[*h]x[$5f][*h]t[*3r]e)|z[*@n][$5f]{1,2}[+g][*3rh]?eo[*@n][+g]|a[*h][+g][ -]?[$5f][*@n][(<p]x|c(?:[*@n]xl|(?:[*h]{2}|[*0b][y|][*@n][(<p]?)x)|d[*h][*3r]{2}s|(?:w[*@n][(<p]x|w[*3r]ex)[ -]?[*0b]ss/gi,
	// 2 Strikes
	/o[!*1v]?[+g][(<p][#u]|(?<![a-z])(?:a[!*1v]+tt(?:[*3rh]?e|[*@n])(?:[ -]?[*3r]q|q[*0b]z|[#u][*3r][*@n]q|[!*1v]at|[!*1v][$5f][#uz]|y[!*1v]at|l)?[$5f]?|o[*@n][$5f][+g][*@n]eq(?:[!*1v][$5f]z|[ye|]l|e[!*1v][*3r][$5f]|[$5fl])?)|(?:[$5f]z[*h][+g]{1,2}(?:[!*1v][*3r](?:e|[$5f][+g])|[$5fl])?|s[*@n][!*1v]?tt?(?:[*3r]q|[!*1v][*3r](?:e|[$5f][+g])|[!*1v][+ag]|[*0b][+g][$5fl]|[*0b][+g]|[*0b][+g]el|l)?[$5f]?|w[*@n]c(?:[$*35rf]|[*3r]q|[*3r]e|[*3r]e[!*1v][*3r][$5f]|[*3r]e[$5f]|[*3r]el|[*3r][$5f]|[!*1v]at|[!*1v]at[$5f]|c[*3r]q|c[!*1v]at)?|c[!*1v][$5f]{2}(?:[ -]?[*h]c[$5f]?|[*3r][$5qf]|[*3r]e[$5f]?|[#u](?:[*3r][*@n]q|[*0b][y|][*3r])[$5f]?|[!*1v][*3r]e|[!*1v]at|c[*0b]{2}e|c[*0b][+g][$5f]?|[+g][*@n]x[*3r][$5f]?|[+g][*@n]x[!*1v]at|l)?|j[*@n]ax(?:[!*1v]?[*3r]e[$5f]?|[!*1v](?:[*3r][$5f][+g]|at)|y[*3r]|[$5fl])?)(?![a-z])|[(<p][*@n]ec[*3r][+g][ -]?z[*h]a[(<p][#u][*3r]e|[$5f](?:[y|][*h][+g]|[#u][*3r][ -]?z[*@n][y|][*3r])|[y|][*3r]mm[!*1v][*@n]|q[*0b]z[!*1v]a[*@n][+g]e[!*1v]|s[*h]qt[*3r][ -]?c[*@n][(<p]x[*3r]|[#u][*0bh]ax[*3r]?|j?[#u][*0b]e[*3r]|j[*3r][+g][ -]?o[*@n][(<p]/gi,
];

/** @param {string} text */
function caesar(text, rot = 13) {
	return text.replace(/[a-zA-Z]/g, function (chr) {
		var start = chr <= "Z" ? 65 : 97;
		return String.fromCharCode(start + ((chr.charCodeAt(0) - start + rot) % 26));
	});
}

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
		}, caesar(text.normalize("NFD").replace(/[\p{Diacritic}\u00AD\u034F\u061C\u070F\u17B4\u17B5\u180E\u200A-\u200F\u2060-\u2064\u206A-\u206F𝅳�\uFEFF\uFFA0]/gu, ""))),
	);
	return words.flat().length
		? {
				censored,
				strikes: words.reduce((acc, curr, index) => curr.length * index + acc, 0),
				words,
		  }
		: false;
}

/** @param {import("discord.js").Message} message */
export async function automodMessage(
	message,
	{ emojis = true, language = true, invites = true } = {},
	silent = false,
) {
	let isBad = false;

	/** @param {string} toCensor */
	async function censorString(toCensor) {
		const promises = [];
		if (language && (silent || !badWordsAllowed(message.channel))) {
			const censored = censor(toCensor);
			if (censored) {
				if (silent) return [];
				promises.push([
					warn(
						message.member || message.author,
						"Watch your language!",
						censored.strikes,
					),
					message.channel.send({
						content:
							CONSTANTS.emojis.statuses.no +
							` ${message.author.toString()}, watch your language!`,
					}),
				]);
			}
		}

		if (
			invites &&
			(silent ||
				![
					message.guild?.rulesChannel?.id,
					"806605043817644074",
					"874743757210275860",
					"816329956074061867",
					message.guild?.publicUpdatesChannel?.id,
					process.env.LOGS_CHANNEL,
					process.env.MODMAIL_CHANNEL,
					"806624037224185886",
				].includes(
					(message.channel.isThread() && message.channel.parent?.id) ||
						message.channel.id,
				))
		) {
			const templates = toCensor.match(GuildTemplate.GUILD_TEMPLATES_PATTERN);
			if (templates) {
				if (silent) return [];
				promises.push(
					warn(
						message.member || message.author,
						"Please don't post server templates!",
						Math.max(0, templates.length - 2),
					),
					message.channel.send({
						content:
							CONSTANTS.emojis.statuses.no +
							` ${message.author.toString()}, server templates go to <#806624037224185886>!`,
					}),
				);
			}

			const botLinks = toCensor.match(/discord(?:app)?\.com\/(api\/)?oauth2\/authorize/gi);
			if (botLinks) {
				if (silent) return [];
				promises.push(
					warn(
						message.member || message.author,
						"Please don't post bot invite links!",
						Math.max(0, botLinks.length - 1),
					),
					message.channel.send({
						content:
							CONSTANTS.emojis.statuses.no +
							` ${message.author.toString()}, bot invites go to <#806624037224185886>!`,
					}),
				);
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
					if (silent) return [];
					promises.push(
						warn(
							message.member || message.author,
							"Please don't post invite links!",
							invitesToDelete,
						),
						message.channel.send({
							content:
								CONSTANTS.emojis.statuses.no +
								` ${message.author.toString()}, invite links go to <#806624037224185886>!`,
						}),
					);
				}
			}
		}

		return promises.length ? promises : undefined;
	}

	const censoredContent = await censorString(stripMarkdown(message.cleanContent));

	if (censoredContent) {
		await Promise.all(censoredContent);
		isBad = true;
	}

	if (
		await firstPromiseValued(
			true,
			message.stickers.map(async ({ name }) => {
				const censored = await censorString(name);
				if (censored) {
					Promise.all(censored).then(() => {});
					return true;
				}
				return false;
			}),
		)
	)
		isBad = true;

	if (
		await firstPromiseValued(
			true,
			message.attachments.map(async (attachment) => {
				if (attachment.name) {
					const censored = await censorString(attachment.name);
					if (censored) {
						await Promise.all(censored);
						return true;
					}
				}
				if (attachment.description) {
					const censored = await censorString(attachment.description);
					if (censored) {
						await Promise.all(censored);
						return true;
					}
				}
				if (
					attachment.contentType?.startsWith("text/") ||
					["application/json", "application/xml", "application/rss+xml"].includes(
						attachment.contentType || "",
					)
				) {
					const censored = await censorString(
						await fetch(attachment.url).then((res) => res.text()),
					);
					if (censored) {
						await Promise.all(censored);
						return true;
					}
				}
				return false;
			}),
		)
	)
		isBad = true;
	if (emojis) {
		const animatedEmojiCount = message.content.match(/<a:.+?:\d+>/gi)?.length || 0;
		if (
			(silent ||
				!(
					((message.channel.isThread() && message.channel.parent?.id) ||
						message.channel.id) === process.env.BOTS_CHANNEL
				)) &&
			animatedEmojiCount > 9
		) {
			await Promise.all([
				warn(
					message.member || message.author,
					`Please don\'t post ${animatedEmojiCount} animated emojis!`,
					Math.round(animatedEmojiCount / 25),
				),
				message.channel.send({
					content:
						CONSTANTS.emojis.statuses.no +
						` ${message.author.toString()}, that's too many animated emojis!`,
				}),
			]);
			isBad = true;
		}
	}

	if (isBad && !silent) await message.delete();

	return isBad;
}

/** @param {import("discord.js").TextBasedChannel | null} channel */ export function badWordsAllowed(
	channel,
) {
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
