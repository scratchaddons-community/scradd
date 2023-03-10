import { joinWithAnd, pingablify } from "../util/text.js";
import CONSTANTS from "./CONSTANTS.js";
import censor from "./language.js";
import warn from "./punishments.js";

const NICKNAME_RULE = 8;

/**
 * Set a users nickname, unless they aren’t moderatable, in which case send a warning in #mod-logs.
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
 * Checks a user’s nickname for rule 7 and changes it if it is rulebreaking.
 *
 * @param {import("discord.js").GuildMember} member - The member to change nickname of.
 * @param {boolean} shouldWarn - Whether to warn them if it has bad words.
 */
export default async function changeNickname(member, shouldWarn = true) {
	const censored = censor(member.displayName);

	if (censored) {
		await setNickname(member, pingablify(censored.censored));
		if (shouldWarn) {
			await warn(member, "Watch your language!", censored.strikes, member.displayName);
		} else {
			await member
				.send(
					`${CONSTANTS.emojis.statuses.no} I censored some bad words in your username. If you change your nickname to include bad words, you may be warned.`,
				)
				.catch(() => {});
		}
	}

	const pingablified = pingablify(member.displayName);

	if (pingablified !== member.displayName) {
		await setNickname(member, pingablified);
		await member
			.send(
				`⚠ For your information, I automatically removed non-easily-pingable characters from your nickname to comply with rule ${NICKNAME_RULE}. You may change it to something else that’s easily typable on American English keyboards if you dislike what I chose.`,
			)
			.catch(() => {});

		return;
	}

	const members = (
		await CONSTANTS.guild.members.fetch({
			query: member.displayName,
			limit: 100,
		})
	).filter((found) => found.displayName === member.displayName);

	if (members.size > 1) {
		const [safe, unsafe] = members.partition(
			(found) => found.user.username === member.displayName,
		);

		if (safe.size > 0) {
			await Promise.all(
				unsafe
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
				await CONSTANTS.channels.modlogs?.send({
					allowedMentions: { users: [] },
					content: `⚠ Conflicting nicknames: ${joinWithAnd(safe.toJSON())}.`,
				});
			}
		} else if (
			unsafe.size > 1 &&
			unsafe.has(member.id) &&
			(await setNickname(member, member.user.username))
		) {
			unsafe.delete(member.id);
		}

		if (unsafe.size > 1) {
			await CONSTANTS.channels.modlogs?.send({
				allowedMentions: { users: [] },
				content: `⚠ Conflicting nicknames: ${joinWithAnd(unsafe.toJSON())}.`,
			});
		}
	}
}
