import {
	Base,
	type AuditLogEvent,
	type GuildAuditLogsEntry,
	type APIRole,
	roleMention,
	Role,
} from "discord.js";
import log, { LogSeverity, LoggingEmojis, extraAuditLogsInfo } from "./misc.js";
import { joinWithAnd } from "../../util/text.js";
import config from "../../common/config.js";

export async function memberRoleUpdate(entry: GuildAuditLogsEntry<AuditLogEvent.MemberRoleUpdate>) {
	if (!entry.target) return;

	const addedRoles = entry.changes
		.filter((change): change is { key: "$add"; new: APIRole[] } => change.key === "$add")
		.flatMap((change) => change.new);

	const removedRoles = entry.changes
		.filter((change): change is { key: "$remove"; new: APIRole[] } => change.key === "$remove")
		.flatMap((change) => change.new);

	if (addedRoles.length)
		await log(
			`${LoggingEmojis.Role} ${entry.target.toString()} gained ${joinWithAnd(
				addedRoles,
				({ id }) => roleMention(id),
			)}${entry.executor ? ` from ${entry.executor.toString()}` : ""}${
				entry.reason ? ` (${entry.reason})` : ""
			}`,
			LogSeverity.ServerChange,
		);

	if (removedRoles.length)
		await log(
			`${LoggingEmojis.Role} ${entry.target.toString()} lost ${joinWithAnd(
				removedRoles,
				({ id }) => roleMention(id),
			)}${entry.executor ? ` from ${entry.executor.toString()}` : ""}${
				entry.reason ? ` (${entry.reason})` : ""
			}`,
			LogSeverity.ServerChange,
		);
}

export async function roleCreate(entry: GuildAuditLogsEntry<AuditLogEvent.RoleCreate>) {
	if (!(entry.target instanceof Base)) return;
	await log(
		`${LoggingEmojis.Role} ${entry.target.toString()} created${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}

export async function roleUpdate(entry: GuildAuditLogsEntry<AuditLogEvent.RoleUpdate>) {
	if (!(entry.target instanceof Role)) return;
	let iconChanged = false;

	for (const change of entry.changes) {
		const key = change.key as
			| Extract<typeof change.key, keyof APIRole | "icon_hash">
			| "unicode_emoji";
		switch (key) {
			case "name": {
				await log(
					`${LoggingEmojis.Role} ${roleMention(entry.target.id)} (@${
						change.old
					}) renamed to @${change.new}${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
				);
				break;
			}
			case "color": {
				await log(
					`${LoggingEmojis.Role} ${roleMention(entry.target.id)}’s role color ${
						typeof change.new === "number" && change.new
							? `set to \`#${change.new.toString(16).padStart(6, "0")}\``
							: "reset"
					}${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
				);
				break;
			}
			case "hoist": {
				await log(
					`${LoggingEmojis.Role} ${roleMention(
						entry.target.id,
					)} set to display role members ${
						change.new ? "separately from" : "combined with"
					} online members${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
				);
				break;
			}
			case "mentionable": {
				await log(
					`${LoggingEmojis.Role} ${roleMention(entry.target.id)} set to ${
						change.new ? "" : "dis"
					}allow anyone to @mention this role${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
				);
				break;
			}
			case "permissions": {
				await log(
					`${LoggingEmojis.Role} ${roleMention(
						entry.target.id,
					)}’s permissions changed${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
					{
						buttons: [
							{
								label: "Permissions",
								url: `https://discordlookup.com/permissions-calculator/${change.new}`,
							},
						],
					},
				);
				break;
			}
			case "icon_hash":
			case "unicode_emoji": {
				iconChanged ||= true;
				break;
			}
			default: {
				break;
			}
		}
	}

	if (!iconChanged || !(entry.target instanceof Role)) return;
	await log(
		`${LoggingEmojis.Role} ${roleMention(entry.target.id)}’s role icon ${
			entry.target.unicodeEmoji
				? `set to ${entry.target.unicodeEmoji}`
				: entry.target.icon
				? "changed"
				: "removed"
		}${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
		{ files: entry.target.icon ? [entry.target.iconURL({ size: 128 }) ?? ""] : [] },
	);
}

export async function roleDelete(role: Role) {
	if (role.guild.id !== config.guild.id) return;
	await log(
		`${LoggingEmojis.Role} @${role.name} (ID: ${role.id}) deleted`,
		LogSeverity.ImportantUpdate,
	);
}
