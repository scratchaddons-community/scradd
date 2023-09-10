import type { GuildMember } from "discord.js";
import config from "../../common/config.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LoggingErrorEmoji } from "../logging/misc.js";
import warn from "../punishments/warn.js";
import censor from "./language.js";

export default async function changeNickname(member: GuildMember) {
	const censored = censor(member.displayName);
	const newNick = findName(member);

	if (censored && member.nickname)
		await warn(
			member,
			"Watch your language!",
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
				const censored = censor(found.user.displayName);
				const nick = censored ? censored.censored : found.user.displayName;

				if (nick !== found.displayName && isPingable(nick)) {
					await setNickname(found, nick, "Conflicts");
					unsafe.delete(id);
				}
			}
		}

		// eslint-disable-next-line unicorn/prefer-spread -- This is not an array
		const unchanged = safe.concat(unsafe);

		if (unchanged.size > 1 && unchanged.has(member.id)) {
			const censored = censor(member.user.displayName);
			const nick = censored ? censored.censored : member.user.displayName;

			if (nick !== newNick && isPingable(nick)) {
				await setNickname(member, nick, "Conflicts");
				unchanged.delete(member.id);
			}
		}
		if (unchanged.size > 1) {
			for (const member of unchanged.values()) {
				const censored = censor(member.user.username);
				const nick = censored ? censored.censored : member.user.username;

				if (nick !== member.displayName && isPingable(nick)) {
					await setNickname(member, nick, "Conflicts");
					unchanged.delete(member.id);
				}
			}
		}

		const sorted = unchanged.sort((one, two) => +(two.joinedAt ?? 0) - +(one.joinedAt ?? 0));
		if (unchanged.size === 2) {
			const oldest = sorted.firstKey();
			if (oldest) unchanged.delete(oldest);
		} else if (unchanged.size > 1)
			await log(
				`${LoggingErrorEmoji} Conflicting nicknames: ${joinWithAnd(sorted.toJSON())}`,
			);
	}
}

async function setNickname(member: GuildMember, newNickname: string, reason: string) {
	await (member.moderatable
		? // eslint-disable-next-line unicorn/no-null
		  member.setNickname(member.user.displayName === newNickname ? null : newNickname, reason)
		: log(
				`${LoggingErrorEmoji} Missing permissions to change ${member.toString()}’s nickname to \`${newNickname}\` (${reason})`,
		  ));
}

function findName(member: GuildMember) {
	const censoredNick = (censor(member.displayName) || undefined)?.censored || member.displayName;
	if (isPingable(censoredNick)) return censoredNick;

	const censoredDisplay =
		(censor(member.user.displayName) || undefined)?.censored || member.user.displayName;
	if (isPingable(censoredDisplay)) return censoredDisplay;

	const censoredTag = (censor(member.user.tag) || undefined)?.censored || member.user.tag;
	if (isPingable(censoredTag)) return censoredTag;

	return censoredNick;
}

function isPingable(name: string) {
	const normalized = name.normalize("NFD").replaceAll(/\p{Dia}/gu, "");
	return /[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>?-]{3,}|^[\w`~!@#$%^&*()=+[\]\\{}|;':",./<>? -]+$/u.test(
		normalized,
	);
}
