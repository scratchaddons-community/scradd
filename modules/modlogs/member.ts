import { APIRole, AuditLogEvent, GuildAuditLogsEntry, GuildMember, PartialGuildMember, roleMention, time } from "discord.js";
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

	if (oldMember.user.avatar !== newMember.user.avatar) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()} changed their avatar`,
			"members",
			{
				files: [newMember.user.displayAvatarURL({ size: 128 })],
			},
		);
	}

	const quarantined = !!newMember.user.flags?.has("Quarantined");
	if (!!oldMember.user.flags?.has("Quarantined") !== quarantined) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()} ${
				quarantined ? "" : "un"
			}quarantined`,
			"members",
		);
	}

	const spammer = !!newMember.user.flags?.has("Spammer");
	if (!!oldMember.user.flags?.has("Spammer") !== spammer) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()} ${
				spammer ? "" : "un"
			}marked as likely spammer`,
			"members",
		);
	}

	if (oldMember.user.tag !== newMember.user.tag) {
		await log(
			`${LoggingEmojis.UserUpdate} ${newMember.toString()} changed their username from ${
				oldMember.user.tag
			} to ${newMember.user.tag}`,
			"members",
		);
	}

	if (newMember.roles.premiumSubscriberRole && config.roles.booster)
		await newMember.roles.add(config.roles.booster, "Boosted the server");
}
