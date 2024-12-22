import type { AuditLogEvent, GuildMember, PartialGuildMember, PartialUser, User } from "discord.js";
import type { AuditLog } from "./util.ts";

import { time } from "discord.js";

import config from "../../common/config.ts";
import log from "./misc.ts";
import { extraAuditLogsInfo, LoggingEmojis, LogSeverity } from "./util.ts";

export async function memberKick(entry: AuditLog<AuditLogEvent.MemberKick>): Promise<void> {
	await log(
		`${LoggingEmojis.Punishment} ${
			entry.target?.toString() ?? "User"
		} kicked${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}
export async function memberPrune(entry: AuditLog<AuditLogEvent.MemberPrune>): Promise<void> {
	await log(
		`${LoggingEmojis.Punishment} ${entry.extra.removed} members who haven’t talked in ${
			entry.extra.days
		} days pruned${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}
export async function memberBanAdd(entry: AuditLog<AuditLogEvent.MemberBanAdd>): Promise<void> {
	await log(
		`${LoggingEmojis.Punishment} ${
			entry.target?.toString() ?? "User"
		} banned${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}
export async function memberBanRemove(
	entry: AuditLog<AuditLogEvent.MemberBanRemove>,
): Promise<void> {
	await log(
		`${LoggingEmojis.Punishment} ${
			entry.target?.toString() ?? "User"
		} unbanned${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}

export async function guildMemberAdd(member: GuildMember): Promise<void> {
	if (member.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Member} ${member.toString()} joined`, LogSeverity.Resource);
}
export async function guildMemberRemove(member: GuildMember | PartialGuildMember): Promise<void> {
	if (member.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Member} ${member.toString()} left`, LogSeverity.Resource);
}
export async function guildMemberUpdate(
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
): Promise<void> {
	if (oldMember.avatar !== newMember.avatar) {
		const url = newMember.avatarURL({ size: 256 });
		await log(
			`${LoggingEmojis.User} ${newMember.toString()} ${
				url ? "changed" : "removed"
			} their server avatar`,
			LogSeverity.ServerChange,
			{ files: url ? [url] : undefined },
		);
	}

	if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
		if (
			newMember.communicationDisabledUntil &&
			Number(newMember.communicationDisabledUntil) > Date.now()
		)
			await log(
				`${LoggingEmojis.Punishment} ${newMember.toString()} timed out until ${time(
					newMember.communicationDisabledUntil,
				)}`,
				LogSeverity.ImportantUpdate,
			);
		else if (
			oldMember.communicationDisabledUntil &&
			Number(oldMember.communicationDisabledUntil) > Date.now()
		)
			await log(
				`${LoggingEmojis.Punishment} ${newMember.toString()}’s timeout was removed`,
				LogSeverity.ImportantUpdate,
			);
	}

	const automodQuarantine =
		newMember.flags.has("AutomodQuarantinedBio") ||
		newMember.flags.has("AutomodQuarantinedUsernameOrGuildNickname");
	if (
		(oldMember.flags.has("AutomodQuarantinedBio") ||
			oldMember.flags.has("AutomodQuarantinedUsernameOrGuildNickname")) !== automodQuarantine
	) {
		await log(
			`${LoggingEmojis.Punishment} ${newMember.toString()} ${
				automodQuarantine ? "" : "un"
			}quarantined based on AutoMod rules`,
			LogSeverity.ImportantUpdate,
		);
	}

	const verified = newMember.flags.has("BypassesVerification");
	if (oldMember.flags.has("BypassesVerification") !== verified) {
		await log(
			`${LoggingEmojis.Punishment} ${newMember.toString()} ${
				verified ? "" : "un"
			}verified by a moderator`,
			LogSeverity.ImportantUpdate,
		);
	}

	if (oldMember.nickname !== newMember.nickname)
		await log(
			`${LoggingEmojis.User} ${newMember.toString()}${
				newMember.nickname ?
					` was nicknamed ${newMember.nickname}`
				:	"’s nickname was removed"
			}`,
			LogSeverity.ServerChange,
		);
}

export async function userUpdate(oldUser: PartialUser | User, newUser: User): Promise<void> {
	if (oldUser.partial || !(await config.guild.members.fetch(newUser).catch(() => void 0))) return;

	const quarantined = !!newUser.flags?.has("Quarantined");
	if (!!oldUser.flags?.has("Quarantined") !== quarantined) {
		await log(
			`${LoggingEmojis.Punishment} ${newUser.toString()} ${
				quarantined ? "" : "un"
			}quarantined`,
			LogSeverity.Alert,
		);
	}
}
