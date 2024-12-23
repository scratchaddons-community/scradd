import type { AuditLogEvent, RoleMention } from "discord.js";
import type { AuditLog } from "./util.ts";

import { Role, roleMention } from "discord.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { joinWithAnd } from "../../util/text.ts";
import log from "./misc.ts";
import { extraAuditLogsInfo, LoggingEmojis, LogSeverity } from "./util.ts";

export async function memberRoleUpdate(
	entry: AuditLog<AuditLogEvent.MemberRoleUpdate, "$add" | "$remove">,
): Promise<void> {
	if (!entry.target) return;
	const assignableRoles = (await config.guild.roles.fetch()).filter(({ flags }) =>
		flags.has("InPrompt"),
	);

	const { $add, $remove } = entry.changes.reduce<{
		$add?: { assignable: RoleMention[]; unassignable: RoleMention[] };
		$remove?: { assignable: RoleMention[]; unassignable: RoleMention[] };
	}>(
		(accumulator, change) =>
			(change.key === "$add" || change.key === "$remove") && change.new ?
				{
					...accumulator,
					[change.key]: change.new.reduce(
						({ assignable, unassignable }, { id }) => {
							(assignableRoles.has(id) ? assignable : unassignable).push(
								roleMention(id),
							);
							return { assignable, unassignable };
						},
						accumulator[change.key] ?? { assignable: [], unassignable: [] },
					),
				}
			:	accumulator,
		{},
	);

	if ($add) {
		await logRoles($add.assignable, "gained", LogSeverity.Resource);
		await logRoles($add.unassignable, "gained", LogSeverity.ServerChange);
	}
	if ($remove) {
		await logRoles($remove.assignable, "lost", LogSeverity.Resource);
		await logRoles($remove.unassignable, "lost", LogSeverity.ServerChange);
	}
	async function logRoles(
		roleMentions: RoleMention[],
		type: string,
		severity: LogSeverity,
	): Promise<void> {
		if (!entry.target || !roleMentions.length) return;
		await log(
			`${LoggingEmojis.Role} ${entry.target.toString()} ${type} ${joinWithAnd(roleMentions)}${
				entry.executor ? ` from ${entry.executor.toString()}` : ""
			}${extraAuditLogsInfo({ reason: entry.reason })}`,
			severity,
		);
	}
}

export async function roleCreate(
	entry: AuditLog<AuditLogEvent.RoleCreate, never, Role>,
): Promise<void> {
	await log(
		`${LoggingEmojis.Role} ${roleMention(entry.target.id)} created${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}

export async function roleUpdate(
	entry: AuditLog<AuditLogEvent.RoleUpdate, "icon_hash" | "unicode_emoji", Role>,
): Promise<void> {
	let iconChanged = false;

	for (const change of entry.changes) {
		switch (change.key) {
			case "name": {
				await log(
					`${LoggingEmojis.Role} ${roleMention(entry.target.id)} ${
						change.old ? `(@${change.old}) ` : ""
					}renamed to @${
						change.new ||
						(entry.target instanceof Role && entry.target.name) ||
						"deleted-role"
					}${extraAuditLogsInfo(entry)}`,
					LogSeverity.ImportantUpdate,
				);
				break;
			}
			case "color": {
				await log(
					`${LoggingEmojis.Role} ${roleMention(entry.target.id)}’s role color ${
						typeof change.new === "number" && change.new ?
							`set to \`#${change.new.toString(16).padStart(6, "0")}\``
						:	"reset"
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
					LogSeverity.ServerChange,
					change.new === undefined ?
						{}
					:	{
							buttons: [
								{
									label: "New Permissions",
									url: `${constants.urls.permissions}/${change.new.valueOf()}`,
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
				//todo: flags, position, tags
				break;
			}
		}
	}

	if (!iconChanged || !(entry.target instanceof Role)) return;
	await log(
		`${LoggingEmojis.Role} ${entry.target.toString()}’s role icon ${
			entry.target.unicodeEmoji ? `set to ${entry.target.unicodeEmoji}`
			: entry.target.icon ? "changed"
			: "removed"
		}${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
		{ files: entry.target.icon ? [entry.target.iconURL({ size: 64 }) ?? ""] : [] },
	);
}

export async function roleDelete(role: Role): Promise<void> {
	if (role.guild.id !== config.guild.id) return;
	await log(
		`${LoggingEmojis.Role} @${role.name} (ID: ${role.id}) deleted`,
		LogSeverity.ImportantUpdate,
	);
}
