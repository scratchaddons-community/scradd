import type { GuildMember } from "discord.js";
import config from "../../common/config.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LogSeverity, LoggingErrorEmoji } from "../logging/misc.js";
import warn from "../punishments/warn.js";
import tryCensor, { censor } from "./language.js";

export default async function changeNickname(member: GuildMember) {
	const censored = tryCensor(member.displayName);
	const newNick = findName(member);

	if (censored && member.nickname)
		await warn(
			member,
			"Please watch your language!",
			censored.strikes,
			"Set nickname to " + member.displayName,
		);

	if (newNick !== member.displayName) {
		const unpingable = isPingable(member.displayName);
		await setNickname(
			member,
			newNick,
			`${censored ? "Has bad words" : ""}${censored && unpingable ? "; " : ""}${
				unpingable ? "Unpingable" : ""
			}`,
		);
		return;
	}

	const members = (await config.guild.members.fetch({ query: newNick, limit: 100 })).filter(
		(found) => found.displayName === newNick,
	);

	if (members.size > 1) {
		const [safe, unsafe] = members.partition((found) => found.user.displayName === newNick);

		if (safe.size) {
			for (const [id, found] of unsafe) {
				const nick = censor(found.user.displayName);
				if (nick !== found.displayName && isPingable(nick)) {
					await setNickname(found, nick, "Conflicts");
					unsafe.delete(id);
				}
			}
		}

		const unchanged = safe
			// eslint-disable-next-line unicorn/prefer-spread -- This is not an array
			.concat(unsafe)
			.toSorted((one, two) => +(two.joinedAt ?? 0) - +(one.joinedAt ?? 0));

		if (unchanged.size > 1 && unchanged.has(member.id)) {
			const nick = censor(member.user.displayName);
			if (nick !== newNick && isPingable(nick)) {
				await setNickname(member, nick, "Conflicts");
				unchanged.delete(member.id);
			}
		}
		if (unchanged.size > 1) {
			for (const member of unchanged.values()) {
				const nick = censor(member.user.username);
				if (nick !== member.displayName && isPingable(nick)) {
					await setNickname(member, nick, "Conflicts");
					unchanged.delete(member.id);
				}
			}
		}

		if (unchanged.size === 2) {
			const oldest = unchanged.firstKey();
			if (oldest) unchanged.delete(oldest);
		} else if (unchanged.size > 1)
			await log(
				`${LoggingErrorEmoji} Conflicting nicknames: ${joinWithAnd(unchanged.values())}`,
				LogSeverity.Alert,
			);
	}
}

async function setNickname(member: GuildMember, newNickname: string, reason: string) {
	await (member.moderatable
		? member.setNickname(member.user.displayName === newNickname ? null : newNickname, reason)
		: log(
				`${LoggingErrorEmoji} Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\` (${reason})`,
				LogSeverity.Alert,
		  ));
}

function findName(member: GuildMember) {
	const nick = censor(member.displayName);
	if (isPingable(nick)) return nick;

	const user = censor(member.user.displayName);
	if (isPingable(user)) return user;

	const tag = censor(member.user.tag);
	if (isPingable(tag)) return tag;

	return nick;
}

function isPingable(name: string) {
	const normalized = name.normalize("NFD").replaceAll(/\p{Dia}/gu, "");
	return /^[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>?-]$|(?:[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>?-].?){2,}/u.test(
		normalized,
	);
}
