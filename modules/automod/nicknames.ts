import type { GuildMember } from "discord.js";
import config from "../../common/config.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LoggingErrorEmoji } from "../logging/misc.js";
import warn from "../punishments/warn.js";
import censor from "./language.js";

export default async function changeNickname(member: GuildMember) {
	const censored = censor(member.displayName);
	const newNick = censored ? censored.censored : member.displayName;

	if (censored) {
		if (member.nickname)
			await warn(
				member,
				"Watch your language!",
				censored.strikes,
				"Set nickname to " + member.displayName,
			);
		await setNickname(member, newNick, "Has bad words");
	}

	const members = (await config.guild.members.fetch({ query: newNick, limit: 100 })).filter(
		(found) => found.displayName === newNick,
	);

	if (members.size > 1) {
		const [safe, unsafe] = members.partition((found) => found.user.displayName === newNick);

		if (safe.size > 0) {
			for (const [id, found] of unsafe) {
				const censored = censor(found.user.displayName);
				const nick = censored ? censored.censored : found.user.displayName;

				if (nick === found.displayName) continue;

				setNickname(found, nick, "Conflicts");
				unsafe.delete(id);
			}
		}
		const unchanged = safe.concat(unsafe);
		if (unchanged.size > 1 && unchanged.has(member.id)) {
			const censored = censor(member.user.displayName);
			const nick = censored ? censored.censored : member.user.displayName;

			if (nick !== member.displayName) {
				setNickname(member, nick, "Conflicts");
				unchanged.delete(member.id);
			}
		}

		if (unchanged.size > 1)
			await log(
				`${LoggingErrorEmoji} Conflicting nicknames: ${joinWithAnd(
					unchanged
						.sort((one, two) => +(two.joinedAt ?? 0) - +(one.joinedAt ?? 0))
						.toJSON(),
				)}`,
			);
	}
}

async function setNickname(member: GuildMember, newNickname: string, reason: string) {
	if (member.moderatable)
		await member.setNickname(
			member.user.displayName === newNickname ? null : newNickname,
			reason,
		);
	else
		await log(
			`${LoggingErrorEmoji} Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\` (${reason})`,
		);
}
