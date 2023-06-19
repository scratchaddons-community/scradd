import {
	type APIRole,
	AuditLogEvent,
	GuildAuditLogsEntry,
	GuildMember,
	type PartialGuildMember,
	type PartialUser,
	roleMention,
	time,
	User,
} from "discord.js";
import config from "../../common/config.js";
import { joinWithAnd } from "../../util/text.js";
import log, { LoggingEmojis, extraAuditLogsInfo } from "./misc.js";

export async function memberKick(entry: GuildAuditLogsEntry<AuditLogEvent.MemberKick>) {
	if (!entry.target) return;
	await log(
		`${LoggingEmojis.Punishment} ${entry.target.toString()} kicked${extraAuditLogsInfo(entry)}`,
		"members",
	);
}
export async function memberPrune(entry: GuildAuditLogsEntry<AuditLogEvent.MemberPrune>) {
	await log(
		`${LoggingEmojis.Punishment} ${entry.extra.removed} members who haven’t talked in ${
			entry.extra.days
		} days pruned${extraAuditLogsInfo(entry)}`,
		"server",
	);
}
export async function memberBanAdd(entry: GuildAuditLogsEntry<AuditLogEvent.MemberBanAdd>) {
	if (!entry.target) return;
	await log(
		`${LoggingEmojis.Punishment} ${entry.target.toString()} banned${extraAuditLogsInfo(entry)}`,
		"members",
	);
}
export async function memberBanRemove(entry: GuildAuditLogsEntry<AuditLogEvent.MemberBanRemove>) {
	if (!entry.target) return;
	await log(
		`${LoggingEmojis.Punishment} ${entry.target.toString()} unbanned${extraAuditLogsInfo(
			entry,
		)}`,
		"members",
	);
}
export async function memberRoleUpdate(entry: GuildAuditLogsEntry<AuditLogEvent.MemberRoleUpdate>) {
	if (!entry.target) return;

	const addedRoles = entry.changes
		.filter((change): change is { key: "$add"; new: APIRole[] } => change.key === "$add")
		.map((change) => change.new)
		.flat();

	const removedRoles = entry.changes
		.filter((change): change is { key: "$remove"; new: APIRole[] } => change.key === "$remove")
		.map((change) => change.new)
		.flat();

	if (addedRoles.length)
		await log(
			`${LoggingEmojis.Role} ${entry.target.toString()} gained ${joinWithAnd(
				addedRoles,
				({ id }) => roleMention(id),
			)}${entry.executor ? ` from ${entry.executor.toString()}` : ""}${
				entry.reason ? ` (${entry.reason})` : ""
			}`,
			"members",
		);

	if (removedRoles.length)
		await log(
			`${LoggingEmojis.Role} ${entry.target.toString()} lost ${joinWithAnd(
				removedRoles,
				({ id }) => roleMention(id),
			)}${entry.executor ? ` from ${entry.executor.toString()}` : ""}${
				entry.reason ? ` (${entry.reason})` : ""
			}`,
			"members",
		);
}

export async function guildMemberAdd(member: GuildMember) {
	if (member.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Member} ${member.toString()} joined`, "members");

	if (member.user.flags?.has("Spammer")) {
		await log(
			`${LoggingEmojis.UserUpdate} ${member.toString()} marked as likely spammer`,
			"members",
		);
	}
}
export async function guildMemberRemove(member: GuildMember | PartialGuildMember) {
	if (member.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Member} ${member.toString()} left`, "members");
}
export async function guildMemberUpdate(
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
) {
	if (newMember.guild.id !== config.guild.id) return;
	if (oldMember.avatar !== newMember.avatar) {
		const url = newMember.avatarURL({ size: 128 });
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()} ${
				url ? "changed" : "removed"
			} their server avatar`,
			"members",
			{ files: url ? [url] : undefined },
		);
	}

	if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
		if (
			newMember.communicationDisabledUntil &&
			Number(newMember.communicationDisabledUntil) > Date.now()
		)
			await log(
				`${LoggingEmojis.UserUpdate} ${newMember.toString()} timed out until ${time(
					newMember.communicationDisabledUntil,
				)}`,
				"members",
			);
		else if (
			oldMember.communicationDisabledUntil &&
			Number(oldMember.communicationDisabledUntil) > Date.now()
		)
			await log(
				`${LoggingEmojis.UserUpdate} ${newMember.toString()}’s timeout was removed`,
				"members",
			);
	}

	const automodQuarantine =
		newMember.flags?.has("AutomodQuarantinedBio") ||
		newMember.flags?.has("AutomodQuarantinedUsernameOrGuildNickname");
	if (
		(oldMember.flags?.has("AutomodQuarantinedBio") ||
			oldMember.flags?.has("AutomodQuarantinedUsernameOrGuildNickname")) !== automodQuarantine
	) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()} ${
				automodQuarantine ? "" : "un"
			}quarantined based on AutoMod rules`,
			"members",
		);
	}

	const verified = !!newMember.flags?.has("BypassesVerification");
	if (!!oldMember.flags?.has("BypassesVerification") !== verified) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()} ${
				verified ? "" : "un"
			}verified by a moderator`,
			"members",
		);
	}

	if (oldMember.nickname !== newMember.nickname)
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()}${
				newMember.nickname
					? ` was nicknamed ${newMember.nickname}`
					: "’s nickname was removed"
			}`,
			"members",
		);
}

export async function userUpdate(oldUser: User | PartialUser, newUser: User) {
	if (oldUser.partial) return;

	if (oldUser.avatar !== newUser.avatar) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newUser.toString()} changed their avatar`,
			"members",
			{
				files: [newUser.displayAvatarURL({ size: 128 })],
			},
		);
	}

	if (oldUser.globalName !== newUser.globalName)
		await log(
			`${LoggingEmojis.UserUpdate} ${newUser.toString()}${
				newUser.globalName
					? oldUser.globalName
						? ` changed their display name from ${oldUser.globalName} to ${newUser.globalName}`
						: ` set their display name to ${newUser.globalName}`
					: "’s display name was removed"
			}`,
			"members",
		);

	const quarantined = !!newUser.flags?.has("Quarantined");
	if (!!oldUser.flags?.has("Quarantined") !== quarantined) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newUser.toString()} ${
				quarantined ? "" : "un"
			}quarantined`,
			"members",
		);
	}

	const spammer = !!newUser.flags?.has("Spammer");
	if (!!oldUser.flags?.has("Spammer") !== spammer) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newUser.toString()} ${
				spammer ? "" : "un"
			}marked as likely spammer`,
			"members",
		);
	}

	if (oldUser.tag !== newUser.tag) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newUser.toString()} changed their username from ${
				oldUser.tag
			} to ${newUser.tag}`,
			"members",
		);
	}
}
