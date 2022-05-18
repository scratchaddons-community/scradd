import { Constants, GuildMember, Util } from "discord.js";
import CONSTANTS from "../CONSTANTS.js";
import { extractData, getDatabases, writeToDatabase } from "../databases.js";
import { Embed } from "@discordjs/builders";
import { stripMarkdown } from "../../lib/markdown.js";
import log from "./logging.js";

/** @typedef {{ user: string; expiresAt: number; info?: string }[]} WarnDatabase */

/**
 * @param {import("discord.js").Message} message
 *
 * @returns
 */
async function getData(message, sendLog = false) {
	return (await /** @type {Promise<WarnDatabase>} */ (extractData(message))).filter((warn) => {
		const expiresAt = new Date(warn.expiresAt);
		if (expiresAt.getTime() < Date.now()) {
			if (sendLog && message.guild)
				log(
					message.guild,
					`Member <@${
						warn.user
					}> lost 1 strike from ${message.guild.me?.toString()}. (Automatically unwarned.)`,
					"members",
				);
			return false;
		} else return true;
	});
}

let /** @type {import("discord.js").Message} */ warnLog,
	/** @type {import("discord.js").Message} */ muteLog;

/**
 * @param {import("discord.js").GuildMember | import("discord.js").User} user
 * @param {number} [strikes]
 * @param {string} reason
 */
export default async function warn(user, reason, strikes = 1, warner = user.client.user) {
	const guild =
		user instanceof GuildMember
			? user.guild
			: await user.client.guilds.fetch(process.env.GUILD_ID || "");
	const modTalk = guild.publicUpdatesChannel;
	if (!modTalk) throw new ReferenceError("Could not find mod talk");
	if (!warnLog || !muteLog) {
		const databases = await getDatabases(["warn", "mute"], modTalk);
		warnLog = databases.warn;
		muteLog = databases.mute;
	}
	const [allWarns, allMutes] = await Promise.all([getData(warnLog), getData(muteLog)]);
	const oldLength = allWarns.length;

	if (strikes < 0) {
		unwarn(user.id, strikes * -1, allWarns);
	}
	const userWarns = allWarns.filter((warn) => warn.user === user.id).length;

	const newMutes = Math.floor(userWarns / 3);

	const promises = [];

	const actualStrikes = allWarns.length + (strikes > 0 ? strikes : 0) - oldLength;

	const logMessage = actualStrikes
		? await log(
				guild,
				`Member ${user.toString()} ${actualStrikes > 0 ? "gained" : "lost"} ${Math.abs(
					actualStrikes,
				)} strike${
					Math.abs(actualStrikes) === 1 ? "" : "s"
				} from ${warner?.toString()}. (${stripMarkdown(reason)})`,
				"members",
		  )
		: undefined;

	if (strikes > 0) {
		allWarns.push(
			...Array(strikes).fill({
				expiresAt: new Date()[
					process.env.NODE_ENV === "production" ? "setDate" : "setMinutes"
				](
					new Date()[process.env.NODE_ENV === "production" ? "getDate" : "getMinutes"]() +
						2,
				),
				info: logMessage?.id,
				user: user.id,
			}),
		);
	}

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
						? member.ban({ reason: "Too many warning" })
						: modTalk.send({
								allowedMentions: { users: [] },
								content: `(Just pretend like ${user.toString()} is banned now, okay?)`,
						  })
					: modTalk.send({
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
						: modTalk.send({
								allowedMentions: { users: [] },
								content: `Missing permissions to mute ${user.toString()} for ${timeoutLength} hour${
									timeoutLength === 1 ? "" : "s"
								}.`,
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
								`You earned ${strikes} strike${
									strikes === 1 ? "" : "s"
								}. **${stripMarkdown(reason)}**`,
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
 * @param {WarnDatabase} warns
 */
function unwarn(user, strikes, warns) {
	for (var i = 0; i < strikes; i++) {
		const index = warns.findIndex((warn) => warn.user === user);
		if (index + 1) warns.splice(index, 1);
		else break;
	}
	return warns;
}
