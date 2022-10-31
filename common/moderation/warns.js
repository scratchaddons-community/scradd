import { GuildMember, User, escapeMarkdown } from "discord.js";
import client from "../../client.js";
import CONSTANTS from "../CONSTANTS.js";
import Database from "../database.js";
import log from "./logging.js";

const EXPIRY_LENGTH = 21;
export const WARNS_PER_MUTE = 3,
	MUTE_LENGTHS = [4, 12, 24],
	WARN_INFO_BASE = 64;

/**
 * @template {Database<"mute" | "warn">} T
 *
 * @param {T} database
 *
 * @returns {Promise<T["data"]>}
 */
export async function removeExpiredWarns(database) {
	/** @type {Record<import("discord.js").Snowflake, number>} */
	const losers = {};
	database.data = database.data.filter((warn) => {
		const expiresAt = new Date(warn.expiresAt);
		if (expiresAt.getTime() < Date.now()) {
			losers[warn.user] ??= 0;
			losers[warn.user]++;
			return false;
		} else return true;
	});

	if (database.name === "warn") {
		await Promise.all(
			Object.entries(losers).map(([user, strikes]) =>
				log(
					`${CONSTANTS.emojis.statuses.yes} <@${user}> lost ${strikes} strike${
						strikes === 1 ? "" : "s"
					} from ${CONSTANTS.guild.members.me?.toString()}!`,
					"members",
					{
						files: [
							{
								attachment: Buffer.from("Automatically unwarned.", "utf-8"),
								name: "warn.txt",
							},
						],
					},
				),
			),
		);
	}

	return database.data;
}

export const warnLog = new Database("warn");
export const muteLog = new Database("mute");
await Promise.all([warnLog.init(), muteLog.init()]);

/**
 * @param {import("discord.js").GuildMember | import("discord.js").User} user
 * @param {string} reason
 * @param {number} strikes
 * @param {import("discord.js").User | string} context
 */
export default async function warn(user, reason, strikes, context) {
	const [allWarns, allMutes] = await Promise.all([
		removeExpiredWarns(warnLog),
		removeExpiredWarns(muteLog),
	]);
	const oldLength = allWarns.length;

	if (strikes < 0) {
		unwarn(user.id, strikes * -1, allWarns);
	}

	const actualStrikes = allWarns.length + (strikes > 0 ? strikes : 0) - oldLength;

	if (strikes < 0 && actualStrikes === 0) return false;

	const promises = [];

	const logMessage = await log(
		`${actualStrikes < 0 ? CONSTANTS.emojis.statuses.yes : "⚠"} ${user.toString()} ` +
			(actualStrikes
				? `${actualStrikes > 0 ? "gained" : "lost"} ${Math.abs(actualStrikes)} strike${
						Math.abs(actualStrikes) === 1 ? "" : "s"
				  } from`
				: "verbally warned by") +
			` ${(context instanceof User ? context : client.user)?.toString()}!`,
		"members",
		{
			files: [
				{
					attachment: Buffer.from(
						reason + (typeof context === "string" ? `\n>>> ${context}` : ""),
						"utf-8",
					),
					name: "warn.txt",
				},
			],
		},
	);

	if (strikes > 0) {
		allWarns.push(
			...Array(strikes).fill({
				expiresAt: new Date()[
					process.env.NODE_ENV === "production" ? "setDate" : "setMinutes"
				](
					new Date()[process.env.NODE_ENV === "production" ? "getDate" : "getMinutes"]() +
						EXPIRY_LENGTH,
				),
				info: logMessage?.id || "",
				user: user.id,
			}),
		);
	}

	const userWarns = allWarns.filter((warn) => warn.user === user.id).length;

	const newMutes = Math.floor(userWarns / WARNS_PER_MUTE);

	const member =
		user instanceof GuildMember
			? user
			: await CONSTANTS.guild.members.fetch(user.id).catch(() => {});
	if (newMutes) {
		const oldMutes = allMutes.filter((mute) => mute.user === user.id).length;

		const userMutes = oldMutes + newMutes;

		unwarn(user.id, newMutes * WARNS_PER_MUTE, allWarns);

		if (userMutes > MUTE_LENGTHS.length || (userMutes === MUTE_LENGTHS.length && strikes > 0)) {
			//ban
			promises.push(
				member?.bannable &&
					!member.roles.premiumSubscriberRole &&
					(member.roles.highest.name === "@everyone" ||
						process.env.NODE_ENV === "production")
					? member.ban({ reason: "Too many warnings" })
					: CONSTANTS.channels.modlogs?.send({
							allowedMentions: { users: [] },
							content: `⚠ Missing permissions to ban ${user.toString()}.`,
					  }),
			);
		} else {
			allMutes.push(
				...Array(newMutes).fill({
					expiresAt: new Date()[
						process.env.NODE_ENV === "production" ? "setDate" : "setMinutes"
					](
						new Date()[
							process.env.NODE_ENV === "production" ? "getDate" : "getMinutes"
						]() + EXPIRY_LENGTH,
					),
					user: user.id,
				}),
			);
			let timeoutLength = 0;
			for (let index = oldMutes; index < userMutes; index++) {
				timeoutLength += MUTE_LENGTHS[index] || 1;
			}
			muteLog.data = allMutes;
			promises.push(
				member?.moderatable
					? member.disableCommunicationUntil(
							timeoutLength *
								(process.env.NODE_ENV === "production" ? 3_600_000 : 60_000) +
								Date.now(),
							"Too many warns",
					  )
					: CONSTANTS.channels.modlogs?.send({
							allowedMentions: { users: [] },
							content: `⚠ Missing permissions to mute ${user.toString()} for ${timeoutLength} ${
								process.env.NODE_ENV === "production" ? "hour" : "minute"
							}${timeoutLength === 1 ? "" : "s"}.`,
					  }),
			);
		}
	}

	warnLog.data = allWarns;
	await Promise.all([
		...promises,

		strikes >= 0 &&
			user
				.send({
					embeds: [
						{
							title: `You were ${
								strikes === 0 ? "verbally " : ""
							}warned in ${escapeMarkdown(CONSTANTS.guild.name)}!`,
							description:
								strikes === 0
									? reason
									: `You gained ${strikes} strike${
											strikes === 1 ? "" : "s"
									  }.\n\n>>> ${reason}`,
							color: member?.displayColor,
							footer:
								strikes === 0
									? undefined
									: {
											icon_url: CONSTANTS.guild.iconURL() ?? undefined,
											text:
												`${
													strikes === 1 ? "This strike" : "These strikes"
												} will automatically be removed in 21 ${
													process.env.NODE_ENV === "production"
														? "day"
														: "minute"
												}s.` +
												"\nTip: Use the /view-warns command to see how many active strikes you have!" +
												"\nYou may DM me to discuss this strike with the mods if you want.",
									  },
						},
					],
				})
				.catch(() => false),
	]);

	return actualStrikes;
}

/**
 * @param {import("discord.js").Snowflake} user
 * @param {number} strikes
 * @param {import("../database").Databases["warn"][]} warns
 */
function unwarn(user, strikes, warns) {
	for (var i = 0; i < strikes; i++) {
		const index = warns.findIndex((warn) => warn.user === user);
		if (index + 1) warns.splice(index, 1);
		else break;
	}
	return warns;
}
