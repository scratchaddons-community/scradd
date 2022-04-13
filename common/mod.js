import { Constants, Util } from "discord.js";
import CONSTANTS from "./CONSTANTS.js";
import { extractData, getDatabases, writeToDatabase } from "./database.js";
import { Embed } from "@discordjs/builders";

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
 * @param {import("discord.js").GuildMember} user
 * @param {number} [strikes]
 * @param {string} [reason]
 */
export default async function warn(user, reason, strikes = 1) {
	const modtalk = await user.client.channels.fetch(process.env.MODTALK_CHANNEL ?? "");
	if (!modtalk?.isText()) throw new TypeError("Could not find modtalk");
	if (!warnLog || !muteLog) {
		const dbs = await getDatabases(["warn", "mute"], modtalk);
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
		unwarn(user, strikes * -1, allWarns);
	}
	const userWarns = allWarns.filter((warn) => warn.user === user.id).length;

	const newMutes = Math.floor(userWarns / 3);

	const promises = [];

	const actualStrikes = allWarns.length - oldLength;

	if (newMutes) {
		const oldMutes = allMutes.filter((mute) => mute.user === user.id).length;

		const userMutes = oldMutes + newMutes;

		unwarn(user, newMutes * 3, allWarns);

		if (userMutes > 3) {
			//ban
			promises.push(
				user.bannable
					? process.env.NODE_ENV === "production" ||
					  user.roles.highest.name === "@everyone"
						? user.ban({ reason: reason ?? "Too many warnings" })
						: modtalk.send({
								allowedMentions: { users: [] },
								content: `(Just pretend like ${user.toString()} is banned now okay?)`,
						  })
					: modtalk.send({
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
					user.moderatable
						? user.disableCommunicationUntil(timeoutLength * 3600000 + Date.now())
						: modtalk.send({
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
				.createDM()
				.then((dm) =>
					dm.send({
						embeds: [
							new Embed()
								.setTitle(
									`You were warned in ${Util.escapeMarkdown(user.guild.name)}!`,
								)
								.setDescription(
									`You earned ${Math.max(1, strikes)} strikes.${
										reason ? ` ${reason}` : ""
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
					}),
				)
				.catch(() => false),
	]);

	return actualStrikes;
}

/**
 * @param {import("discord.js").GuildMember} user
 * @param {number} strikes
 * @param {{ user: string; expiresAt: number }[]} warns
 */
function unwarn(user, strikes, warns) {
	for (var i = 0; i < strikes; i++) {
		const index = warns.findIndex((warn) => warn.user === user.id);
		if (index + 1) warns.splice(index, 1);
		else break;
	}
	return warns;
}
