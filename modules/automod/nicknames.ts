import type { GuildMember } from "discord.js";

import config from "../../common/config.js";
import { joinWithAnd } from "../../util/text.js";
import log from "../logging/misc.js";
import { LoggingEmojisError, LogSeverity } from "../logging/util.js";
import warn from "../punishments/warn.js";
import tryCensor, { censor, isPingable } from "./misc.js";

export default async function changeNickname(member: GuildMember): Promise<void> {
	const censored = tryCensor(member.displayName);
	const newNick = findName(member);

	if (censored && member.nickname)
		await warn(
			member,
			censored.words.length === 1 ? "Used a banned word" : "Used banned words",
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
			.sorted((one, two) => (two.joinedTimestamp ?? 0) - (one.joinedTimestamp ?? 0));

		if (unchanged.size > 1 && unchanged.has(member.id)) {
			const nick = censor(member.user.displayName);
			if (nick !== newNick && isPingable(nick)) {
				await setNickname(member, nick, "Conflicts");
				unchanged.delete(member.id);
			}
		}
		if (unchanged.size > 1) {
			for (const found of unchanged.values()) {
				const nick = censor(found.user.username);
				if (nick !== found.displayName && isPingable(nick)) {
					await setNickname(found, nick, "Conflicts");
					unchanged.delete(found.id);
				}
			}
		}

		if (unchanged.size === 2) {
			const oldest = unchanged.firstKey();
			if (oldest) unchanged.delete(oldest);
		} else if (unchanged.size > 1)
			await log(
				`${LoggingEmojisError} Conflicting nicknames: ${joinWithAnd([...unchanged.values()])}`,
				LogSeverity.Alert,
			);
	}
}

async function setNickname(
	member: GuildMember,
	newNickname: string,
	reason: string,
): Promise<void> {
	if (member.moderatable && newNickname.length <= 32) {
		await member.setNickname(
			member.user.displayName === newNickname ? null : newNickname,
			reason,
		);
		return;
	}

	await log(
		`${LoggingEmojisError} Unable to change ${member.toString()}’s nickname to \`${
			newNickname
		}\` (${reason})`,
		LogSeverity.Alert,
		{ pingHere: true },
	);
}

function findName(member: GuildMember): string {
	if (!tryCensor(member.displayName) && isPingable(member.displayName)) return member.displayName;

	const user = censor(member.user.displayName);
	if (isPingable(user)) return user;

	const tag = censor(member.user.tag);
	if (isPingable(tag)) return tag;

	return censor(member.displayName);
}
