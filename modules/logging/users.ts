import type { AuditLogEvent, GuildMember, PartialGuildMember } from "discord.js";
import type { AuditLog } from "./util.ts";

import { time } from "discord.js";

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
export async function guildMemberUpdate(
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
): Promise<void> {
	if (oldMember.communicationDisabledUntil === newMember.communicationDisabledUntil) return;
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
