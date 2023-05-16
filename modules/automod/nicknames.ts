import type { GuildMember } from "discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LoggingEmojis } from "../modlogs/misc.js";
import warn from "../punishments/warn.js";
import censor from "./language.js";

export default async function changeNickname(member: GuildMember) {
	const censored = censor(member.displayName);
	if (censored) await setNickname(member, censored.censored, "Has bad words");

	const newNick = censored ? censored.censored : member.displayName;

	if (censored && member.nickname)
		warn(
			member,
			"Watch your language!",
			censored.strikes,
			"Set nickname to " + member.displayName,
		);
	const members = (await config.guild.members.fetch({ query: newNick, limit: 100 })).filter(
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
			await log(
				`${LoggingEmojis.Error} Conflicting nicknames: ${joinWithAnd(
					unchanged
						.sort((one, two) => +(two.joinedAt ?? 0) - +(one.joinedAt ?? 0))
						.toJSON(),
				)}`,
			);
	}
}

async function setNickname(member: GuildMember, newNickname: string, reason: string) {
	if (member.moderatable)
		await member.setNickname(member.user.username === newNickname ? null : newNickname, reason);
	else
		await log(
			`${
				LoggingEmojis.Error
			} Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\` (${reason})`,
		);
}
