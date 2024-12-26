import type { AuditLogEvent, GuildScheduledEvent, PartialGuildScheduledEvent } from "discord.js";
import type { AuditLog } from "./util.ts";

import { unifiedDiff } from "difflib";
import { GuildScheduledEventStatus, time } from "discord.js";

import config from "../../common/config.ts";
import log from "./misc.ts";
import { extraAuditLogsInfo, LoggingEmojis, LogSeverity } from "./util.ts";

export async function guildScheduledEventCreate(
	entry: AuditLog<AuditLogEvent.GuildScheduledEventCreate>,
): Promise<void> {
	await log(
		`${LoggingEmojis.Event} [Event ${entry.target.name}](${
			entry.target.url
		}) scheduled${extraAuditLogsInfo(entry)}`,
		LogSeverity.ServerChange,
	);
}

export async function guildScheduledEventUpdate(
	entry: AuditLog<
		AuditLogEvent.GuildScheduledEventUpdate,
		| "entity_id"
		| "entity_metadata"
		| "image_hash"
		| "image"
		| "location"
		| "scheduled_end_time"
		| "scheduled_start_time"
	>,
): Promise<void> {
	let imageChanged = false;
	let timeChanged = false;
	let locationChanged = false;

	for (const change of entry.changes) {
		switch (change.key) {
			case "name": {
				await log(
					`${LoggingEmojis.Event} [Event ${entry.target.name}](${
						entry.target.url
					})’s topic changed to ${change.new ?? ""} (${
						change.old ?? ""
					})${extraAuditLogsInfo(entry)}`,
					LogSeverity.ServerChange,
				);
				break;
			}
			case "description": {
				await log(
					`${LoggingEmojis.Event} [Event ${entry.target.name}](${
						entry.target.url
					})’s description changed${extraAuditLogsInfo(entry)}`,
					LogSeverity.ServerChange,
					{
						files: [
							{
								content: unifiedDiff(
									change.old?.split("\n") ?? [],
									entry.target.description?.split("\n") ?? [],
									{ lineterm: "" },
								)
									.join("\n")
									.replace(/^-{3} \n\+{3} \n/, ""),

								extension: "diff",
							},
						],
					},
				);
				break;
			}
			case "status": {
				await log(
					`${LoggingEmojis.Event} [Event ${entry.target.name}](${entry.target.url}) ${
						{
							[GuildScheduledEventStatus.Active]: "started",
							[GuildScheduledEventStatus.Canceled]: "canceled",
							[GuildScheduledEventStatus.Completed]: "ended",
							[GuildScheduledEventStatus.Scheduled]: "scheduled",
						}[entry.target.status]
					}${extraAuditLogsInfo(entry)}`,
					LogSeverity.ServerChange,
				);
				break;
			}
			case "image":
			case "image_hash": {
				imageChanged = true;
				break;
			}
			case "scheduled_end_time":
			case "scheduled_start_time": {
				timeChanged = true;
				break;
			}
			case "channel_id":
			case "entity_type":
			case "entity_metadata":
			case "entity_id":
			case "location": {
				locationChanged = true;
				break;
			}
			default: {
				// todo: recurrence_rule
				break;
			}
		}

		if (imageChanged) {
			const url = entry.target.coverImageURL({ size: 256 });
			await log(
				`${LoggingEmojis.Event} [Event ${entry.target.name}](${
					entry.target.url
				})’s cover image ${url ? "changed" : "removed"}${extraAuditLogsInfo(entry)}`,
				LogSeverity.ServerChange,
				{ files: url ? [url] : [] },
			);
		}
		if (timeChanged) {
			const start = entry.target.scheduledStartAt;
			const end = entry.target.scheduledEndAt;
			await log(
				`${LoggingEmojis.Event} [Event ${entry.target.name}](${
					entry.target.url
				}) rescheduled${
					(start ?? end) ?
						` to ${time(start ?? end ?? new Date())}${
							end && start ? `-${time(end)}` : ""
						}`
					:	""
				}${extraAuditLogsInfo(entry)}`,
				LogSeverity.ServerChange,
			);
		}
		if (locationChanged)
			await log(
				`${LoggingEmojis.Event} [Event ${entry.target.name}](${
					entry.target.url
				}) moved to ${
					entry.target.channel?.toString() ??
					entry.target.entityMetadata?.location ??
					"an external location"
				}${extraAuditLogsInfo(entry)}`,
				LogSeverity.ServerChange,
			);
	}
}

export async function guildScheduledEventDelete(
	event: GuildScheduledEvent | PartialGuildScheduledEvent,
): Promise<void> {
	if (event.guildId !== config.guild.id || event.partial) return;

	await log(
		`${LoggingEmojis.Event} Event ${event.name} (ID: ${event.id}) removed`,
		LogSeverity.ServerChange,
	);
}
