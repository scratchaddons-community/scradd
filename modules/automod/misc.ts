import type { GuildMember } from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { joinWithAnd } from "../../util/text.js";
import log from "../modlogs/logging.js";
import censor from "./language.js";

export async function changeNickname(member: GuildMember) {
	const censored = censor(member.displayName);
	if (censored) await setNickname(member, censored.censored, "Had bad words");

	const newNick = censored ? censored.censored : member.displayName;

	const members = (await CONSTANTS.guild.members.fetch({ query: newNick, limit: 100 })).filter(
		(found) => found.displayName === newNick,
	);

	if (members.size > 1) {
		const [safe, unsafe] = members.partition((found) => found.user.username === newNick);

		if (safe.size > 0) {
			for (const [id, found] of unsafe) {
				const censored = censor(found.user.username);
				const nick = censored ? censored.censored : found.user.username;

				if (nick === found.displayName) continue;

				setNickname(found, nick, "Conflicts");
				unsafe.delete(id);
			}
		}
		const unchanged = safe.concat(unsafe);
		if (unchanged.size > 1 && unchanged.has(member.id)) {
			const censored = censor(member.user.username);
			const nick = censored ? censored.censored : member.user.username;

			if (nick !== member.displayName) {
				setNickname(member, nick, "Conflicts");
				unchanged.delete(member.id);
			}
		}

		if (unchanged.size > 1)
			await log(`⚠️ Conflicting nicknames: ${joinWithAnd(unchanged.toJSON())}.`);
	}
}

async function setNickname(member: GuildMember, newNickname: string, reason: string) {
	if (member.moderatable)
		await member.setNickname(member.user.username === newNickname ? null : newNickname, reason);
	else
		await log(
			`⚠️ Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\` (${reason}).`,
		);
}
