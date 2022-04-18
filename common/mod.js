import { Constants, GuildMember, Util } from "discord.js";
import CONSTANTS from "./CONSTANTS.js";
import { extractData, getDatabases, writeToDatabase } from "./database.js";
import { Embed } from "@discordjs/builders";
import { strip } from "../lib/escape.js";
import firstPromiseValued from "../lib/firstPromiseValued.js";

/**
 * @param {import("discord.js").Message} log
 *
 * @returns
 */
async function getData(log) {
	return (
		await /** @type {Promise<{ user: string; expiresAt: number }[]>} */ (extractData(log))
	).filter((warn) => {
		const expiresAt = new Date(warn.expiresAt);
		if (expiresAt.getTime() < Date.now()) {
			return false;
		} else return true;
	});
}

let /** @type {import("discord.js").Message} */ warnLog,
	/** @type {import("discord.js").Message} */ muteLog;

/**
 * @param {import("discord.js").GuildMember | import("discord.js").User} user
 * @param {number} [strikes]
 * @param {string} [reason]
 */
export async function warn(user, reason, strikes = 1) {
	const guild =
		user instanceof GuildMember
			? user.guild
			: await user.client.guilds.fetch(process.env.GUILD_ID || "");
	const modLog = guild.systemChannel;
	if (!modLog) throw new TypeError("Could not find mod log");
	if (!warnLog || !muteLog) {
		const dbs = await getDatabases(["warn", "mute"], modLog);
		warnLog = dbs.warn;
		muteLog = dbs.mute;
	}
	const [allWarns, allMutes] = await Promise.all([getData(warnLog), getData(muteLog)]);
	const oldLength = allWarns.length;

	if (strikes > 0) {
		allWarns.push(
			...Array(strikes).fill({
				expiresAt: new Date()[
					process.env.NODE_ENV === "production" ? "setDate" : "setMinutes"
				](
					new Date()[process.env.NODE_ENV === "production" ? "getDate" : "getMinutes"]() +
						2,
				),
				user: user.id,
			}),
		);
	} else {
		unwarn(user.id, strikes * -1, allWarns);
	}
	const userWarns = allWarns.filter((warn) => warn.user === user.id).length;

	const newMutes = Math.floor(userWarns / 3);

	const promises = [];

	const actualStrikes = allWarns.length - oldLength;

	if (newMutes) {
		const member = user instanceof GuildMember ? user : await guild.members.fetch(user.id);
		const oldMutes = allMutes.filter((mute) => mute.user === user.id).length;

		const userMutes = oldMutes + newMutes;

		unwarn(user.id, newMutes * 3, allWarns);

		if (userMutes > 3) {
			//ban
			promises.push(
				member.bannable
					? process.env.NODE_ENV === "production" ||
					  member.roles.highest.name === "@everyone"
						? member.ban({ reason: reason ?? "Too many warnings" })
						: modLog.send({
								allowedMentions: { users: [] },
								content: `(Just pretend like ${user.toString()} is banned now okay?)`,
						  })
					: modLog.send({
							allowedMentions: { users: [] },
							content: `Missing permissions to ban ${user.toString()}.`,
					  }),
			);
		} else {
			allMutes.push(
				...Array(newMutes).fill({
					expiresAt: new Date()[
						process.env.NODE_ENV === "production" ? "setDate" : "setHours"
					](
						new Date()[
							process.env.NODE_ENV === "production" ? "getDate" : "getHours"
						]() + 14,
					),
					user: user.id,
				}),
			);
			let timeoutLength = 0;
			for (let index = oldMutes; index < userMutes; index++) {
				timeoutLength += [2, 12, 36][index] || 1;
			}
			promises.push(
				...[
					writeToDatabase(muteLog, allMutes),
					member.moderatable
						? member.disableCommunicationUntil(timeoutLength * 3600000 + Date.now())
						: modLog.send({
								allowedMentions: { users: [] },
								content: `Missing permissions to mute ${user.toString()} for ${timeoutLength} hours.`,
						  }),
				],
			);
		}
	}

	await Promise.all([
		...promises,
		writeToDatabase(warnLog, allWarns),

		strikes > 0 &&
			user
				.send({
					embeds: [
						new Embed()
							.setTitle(`You were warned in ${Util.escapeMarkdown(guild.name)}!`)
							.setDescription(
								`You earned ${Math.max(1, strikes)} strikes.${
									reason ? ` **${strip(reason)}**` : ""
								}`,
							)
							.setColor(Constants.Colors.DARK_RED)
							.setFooter({
								text:
									`${
										strikes === 1 ? "This strike" : "These strikes"
									} will automatically be removed in ${
										process.env.NODE_ENV === "production"
											? "48 hours"
											: "120 seconds"
									}.` +
									CONSTANTS.footerSeperator +
									"You may DM me to discuss this strike with the mods if you want.",
							}),
					],
				})
				.catch(() => false),
	]);

	return actualStrikes;
}

/**
 * @param {string} user
 * @param {number} strikes
 * @param {{ user: string; expiresAt: number }[]} warns
 */
function unwarn(user, strikes, warns) {
	for (var i = 0; i < strikes; i++) {
		const index = warns.findIndex((warn) => warn.user === user);
		if (index + 1) warns.splice(index, 1);
		else break;
	}
	return warns;
}

const regexps = [
	// Just Delete
	/[+g][*3r][$5f][+g][!*1v][(<p](?:[*@n][y|]|[y|][*3r])|[$5f](?:[(<p][#u]z[*h][(<p]x|[*@n]q[!*1v][$5f][+g])|o[*h][+g]{1,2}(?:[ -]?c[!*1v]e[*@n][+g][*3r]|j[!*1v]c[*3r])|q[!*1v][y|]{1,2}q[*0b]|e[*3r][(<p][+g][*h]z|i(?:[*@n]t[!*1v]a[*@n][y|]|[*h][y|]i[*@n])|(?<![a-z])(?:i[*@n]t[!*1v]a[*@n](?:[$*35ryf|]|yl)?|c[*3r]a[!*1v][$5f](?:[*3r][$5f])?|[$5f][*3r]k|[*@n]a[*h][$5f](?:[*3r][$5f])?|(?:oe[*3r][*@n][$5f][+g]|[$5f][*3r]z[*3r]a|[(<p](?:[*h]z|[y|][!*1v][+g])|[+g][*3r]{2}[+g])[$5f]?)(?![a-z])|🖕/gi,
	// 1 Strike
	/[f$][#u][v1!*][+g]|(?<![a-z])(?:(?:(?:o[*@n]q|s[*@n][+g]|w[*@n][(<p]x|w[!*1v]i[*3r]|x[!*1v][(<p]x|[y|][*@n](?:zc|eq)|[+g][!*1v]t[#u][+g]|j[!*1v][$5f][*3r])[ -]?)?[*@n][$5f]{2}(?:[ -]?(?:[(<p][y|][*0b]ja|s[*@n][(<p][*3r]|[#u][*@n][+g]|[#u][*0b][y|][*3r]|[y|][*0b][*@n]q|e[*@n]z(?:z(?:[*3r]e)?(?:[!*1v]at)?)?|j[!*1v]c[*3r])[$5f]?|[*3r](?:el|[$5f]q?))?|[!*1v]aw[*h]a[$5f]?|[(<p][*0b][(<p]?x(?:[ -]?s[!*1v]t[#u][+g]|[$5f][*h][(<p]x|(?:s[!*1v]t[#u][+g]|[$5f][*h][(<p]x)(?:[*3r]e|[!*1v]at)|z[*@n]a[$5f][#u][!*1v]c|[*h]c)?[$5f]?|[+g](?:j[*@n][+g]+(?:[*3r]q|[!*1v]at|[y|][*3r]|[y|][*3r]q|[y|][*3r]e|[y|][!*1v]at|[$5f])?[$5f]|[!*1v][+g](?:[!*1v][*3r]|[!*1v][*3r][$5f]|[$+5fg]|[+g]l)?)|[$5f]c[!*1v][(<p][$5f]?|[y|][*3r][$5f]o[*0b][$5f]?|o[*0b]{2}o(?:[!*1v](?:[*3r]|[*3r][$5f]|at)|[$5fl])?|(o[!*1v]t[ -]?)?q[!*1v][(<p]x[*3r]?(?:[ -]?[*3r][qel]|[*3r]e[!*1v]at|[*3r]e[$5f]|[#u][*3r][*@n]q|[#u][*3r][*@n]q[$5f]|[!*1v][*3r]|[!*1v][*3r][%4ef]|[!*1v][*3r][$5f][+g]|[!*1v]at|[$5fl]|j[*@n]q|j[*@n]q[$5f]|lo[!*1v]eq|lo[!*1v]eq[$5f])?|t[*0b]{2}x[$5fl]?|[#u][*3r]z[!*1v][ -]?c[*3r]a[!*1v][$5f]|c(?:[*@n](?:[(<p]?x(?:[!*1v][*3r]|l)|[*@n]x[!*1v])[$5f]?|[*3r](?:[(<p]x[*3r]e[$5f]?|a[!*1v][$5f][ -]?oe[*3r][*@n][+g][#u]))|j[*0b]c(?:[!*1v]at|[$5f])?|(?:(?:[$5f][#u][*0b]e[+g]|[$5f]z[*@n]e[+g])[ -]?)?[*@n]e[$5f][*3r](?:[$5qfl]|[#u][*0b][y|][*3r][$5qf]?|[y|][!*1v][(<p]x(?:[*3r]e[$5f]?|[!*1v]at))?)(?![a-z])|[(<p][#u][!*1v]at[ -]?[(<p][#u][*0b]at|[(<px][*h]?a[+g][$5f]?|[*@n]e[$5f][(<p][#u][y|][*0b][(<p][#u]|[*3r]w[*@n](?:[(<px]|[(<p]x)[*h][y|][*@n][+g][*3r]|[$5f](?:c[y|][*0b]{2}t[*3r]|c[#u][*3r]a[(<p][+g][*3r]e|j[*@n][$5f][+g][!*1v]x[*@n]|卐|卍|[(<p][#u][*@n]ss[*3r]e)|o(?:[*0b][y|]{2}[*0b][(<p]x|[y|][*0b]j[ -]?w[*0b]o)|s(?:[*@n]aal|[*h][(<p]?x)|t[*0b]q[ -]?q[*@n]za|w[!*1v][$5fm][zm]|x(?:[!*1v]x[*3r]|[*h]x[$5f][*h]t[*3r]e)|z[*@n][$5f]{1,2}[+g][*3rh]?eo[*@n][+g]|a[*h][+g][ -]?[$5f][*@n][(<p]x|c(?:[*@n]xl|(?:[*h]{2}|[*0b][y|][*@n][(<p]?)x)|d[*h][*3r]{2}s|(?:w[*@n][(<p]x|w[*3r]ex)[ -]?[*0b]ss/gi,
	// 2 Strikes
	/o[!*1v]?[+g][(<p][#u]|(?<![a-z])(?:[$5f]z[*h][+g]{1,2}(?:[!*1v][*3r](?:e|[$5f][+g])|[$5fl])?|s[*@n][!*1v]?tt?(?:[*3r]q|[!*1v][*3r](?:e|[$5f][+g])|[!*1v][+ag]|[*0b][+g][$5fl]|[*0b][+g]|[*0b][+g]el|l)?[$5f]?|w[*@n]c(?:[$*35rf]|[*3r]q|[*3r]e|[*3r]e[!*1v][*3r][$5f]|[*3r]e[$5f]|[*3r]el|[*3r][$5f]|[!*1v]at|[!*1v]at[$5f]|c[*3r]q|c[!*1v]at)?|c[!*1v][$5f]{2}(?:[ -]?[*h]c[$5f]?|[*3r][$5qf]|[*3r]e[$5f]?|[#u](?:[*3r][*@n]q|[*0b][y|][*3r])[$5f]?|[!*1v][*3r]e|[!*1v]at|c[*0b]{2}e|c[*0b][+g][$5f]?|[+g][*@n]x[*3r][$5f]?|[+g][*@n]x[!*1v]at|l)?|j[*@n]ax(?:[!*1v]?[*3r]e[$5f]?|[!*1v](?:[*3r][$5f][+g]|at)|y[*3r]|[$5fl])?)(?![a-z])|[(<p][*@n]ec[*3r][+g][ -]?z[*h]a[(<p][#u][*3r]e|[$5f](?:[y|][*h][+g]|[#u][*3r][ -]?z[*@n][y|][*3r])|[y|][*3r]mm[!*1v][*@n]|q[*0b]z[!*1v]a[*@n][+g]e[!*1v]|s[*h]qt[*3r][ -]?c[*@n][(<p]x[*3r]|[#u][*0bh]ax[*3r]?|j?[#u][*0b]e[*3r]|j[*3r][+g][ -]?o[*@n][(<p]/gi,
	// 3 Strikes (2-Hour Timeout)
	/(?<![a-z])(?:a[!*1v]+tt(?:[*3rh]?e|[*@n])(?:[ -]?[*3r]q|q[*0b]z|[#u][*3r][*@n]q|[!*1v]at|[!*1v][$5f][#uz]|y[!*1v]at|l)?[$5f]?|o[*@n][$5f][+g][*@n]eq(?:[!*1v][$5f]z|[ye|]l|e[!*1v][*3r][$5f]|[$5fl])?)(?![a-z])/gi,
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
export async function censorMessage(message) {
	/** @param {string} toCensor */
	function removeLanguage(toCensor) {
		const censored = censor(toCensor);
		if (!censored) return;

		return [
			message.delete(),
			warn(message.member || message.author, "Watch your language!", censored.strikes),
			message.channel.send({
				content:
					CONSTANTS.emojis.statuses.no +
					` ${message.author.toString()}, watch your language!`,
			}),
		];
	}
	const censoredContent = removeLanguage(strip(message.cleanContent));
	if (censoredContent) {
		await Promise.all(censoredContent);
		return true;
	}

	if (
		message.stickers.find(({ name }) => {
			const censored = removeLanguage(name);
			if (censored) {
				Promise.all(censored).then(() => {});
				return true;
			}
			return false;
		})
	)
		return true;

	if (
		await firstPromiseValued(
			true,
			message.attachments.map(async (attachment) => {
				if (attachment.name) {
					const censored = removeLanguage(attachment.name);
					if (censored) {
						await Promise.all(censored);
						return true;
					}
				}
				if (attachment.description) {
					const censored = removeLanguage(attachment.description);
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
					const censored = removeLanguage(
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
		return true;
}

export function badWordsAllowed(channel) {
	return [
		"806895693162872892",
		"816329956074061867",
		process.env.MODLOG_CHANNEL,
		process.env.MODMAIL_CHANNEL,
		"853256939089559583",
		"894314668317880321",
		"869662117651955802",
	].includes(channel.isThread() ? channel.parent?.id || channel.id : channel.id);
}
