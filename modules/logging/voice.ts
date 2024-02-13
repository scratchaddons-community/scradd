import { unifiedDiff } from "difflib";
import {
	type AuditLogEvent,
	ChannelType,
	type GuildScheduledEvent,
	type PartialGuildScheduledEvent,
	type VoiceState,
	GuildScheduledEventStatus,
	time,
} from "discord.js";
import config from "../../common/config.js";
import log, { LogSeverity, LoggingEmojis, extraAuditLogsInfo, type AuditLog } from "./misc.js";

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
		| "channel_id"
		| "entity_id"
		| "entity_metadata"
		| "entity_type"
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
				break;
			}
		}

		if (imageChanged) {
			const url = entry.target.coverImageURL({ size: 128 });
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
					start ?? end
						? ` to ${time(start ?? end ?? new Date())}${
								end && start ? `-${time(end)}` : ""
						  }`
						: ""
				}${extraAuditLogsInfo(entry)}`,
				LogSeverity.ServerChange,
			);
		}
		if (locationChanged) {
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
}

export async function voiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
	if (!newState.member || newState.guild.id !== config.guild.id) return;

	if (oldState.channel?.id !== newState.channel?.id && !newState.member.user.bot) {
		if (oldState.channel && oldState.channel.type !== ChannelType.GuildStageVoice) {
			await log(
				`${
					LoggingEmojis.Voice
				} ${newState.member.toString()} left voice channel ${oldState.channel.toString()}`,
				LogSeverity.Resource,
			);
		}

		if (newState.channel && newState.channel.type !== ChannelType.GuildStageVoice) {
			await log(
				`${
					LoggingEmojis.Voice
				} ${newState.member.toString()} joined voice channel ${newState.channel.toString()}, ${
					newState.mute ? "" : "un"
				}muted and ${newState.deaf ? "" : "un"}deafened`,
				LogSeverity.Resource,
			);
		}

		return;
	}

	if (!newState.channel) return;

	if (newState.suppress && newState.channel.type === ChannelType.GuildStageVoice) return;

	if (Boolean(oldState.selfDeaf) !== Boolean(newState.selfDeaf)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} ${
				newState.selfDeaf ? "" : "un"
			}deafened in ${newState.channel.toString()}`,
			LogSeverity.Resource,
		);
	}

	if (Boolean(oldState.selfMute) !== Boolean(newState.selfMute)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} ${
				newState.selfMute ? "" : "un"
			}muted in ${newState.channel.toString()}`,
			LogSeverity.Resource,
		);
	}

	if (Boolean(oldState.selfVideo) !== Boolean(newState.selfVideo)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} turned camera ${
				newState.selfVideo ? "on" : "off"
			} in ${newState.channel.toString()}`,
			LogSeverity.Resource,
		);
	}

	if (Boolean(oldState.serverDeaf) !== Boolean(newState.serverDeaf)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} was ${
				newState.serverDeaf ? "" : "un-"
			}server deafened`,
			LogSeverity.Resource,
		);
	}

	if (Boolean(oldState.serverMute) !== Boolean(newState.serverMute)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} was ${
				newState.serverMute ? "" : "un-"
			}server muted`,
			LogSeverity.Resource,
		);
	}

	if (Boolean(oldState.streaming) !== Boolean(newState.streaming)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} ${
				newState.streaming ? "started" : "stopped"
			} screen sharing in ${newState.channel.toString()}`,
			LogSeverity.Resource,
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
