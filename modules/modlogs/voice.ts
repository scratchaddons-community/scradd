import { unifiedDiff } from "difflib";
import {
	APIGuildScheduledEvent,
	AuditLogEvent,
	ChannelType,
	GuildAuditLogsEntry,
	GuildScheduledEvent,
	VoiceState,
} from "discord.js";
import config from "../../common/config.js";
import log, { LoggingEmojis, extraAuditLogsInfo } from "./misc.js";

export async function guildScheduledEventCreate(
	entry: GuildAuditLogsEntry<AuditLogEvent.GuildScheduledEventCreate>,
) {
	await log(
		`${LoggingEmojis.Event} Event scheduled${extraAuditLogsInfo(entry)}\n${entry.target.url}`,
		"voice",
	);
}
export async function guildScheduledEventUpdate(
	entry: GuildAuditLogsEntry<AuditLogEvent.GuildScheduledEventUpdate>,
) {
	for (const change of entry.changes) {
		const key = change.key as Extract<
			typeof change.key,
			keyof APIGuildScheduledEvent | "image_hash"
		>;
		switch (key) {
			case "name": {
				await log(
					`${LoggingEmojis.Event} Event ${entry.target.name}’s topic changed to ${
						change.new
					} (${change.old})${extraAuditLogsInfo(entry)}\n${entry.target.url}`,
					"voice",
				);
				break;
			}
			case "description": {
				await log(
					`${LoggingEmojis.Event} Event ${
						entry.target.name
					}’s description changed${extraAuditLogsInfo(entry)}\n${entry.target.url}`,
					"voice",
					{
						files: [
							{
								content: unifiedDiff(
									`${change.old ?? ""}`.split("\n"),
									`${change.new ?? ""}`.split("\n"),
									{ lineterm: "" },
								)
									.join("\n")
									.replace(/^--- \n\+\+\+ \n/, ""),

								extension: "diff",
							},
						],
					},
				);
				break;
			}
			case "channel_id":
			case "entity_type": {
				await log(
					`${LoggingEmojis.Event} Event ${entry.target.name} moved to ${
						entry.target.channel?.toString() ??
						entry.target.entityMetadata?.location ??
						"an external location"
					}${extraAuditLogsInfo(entry)}\n${entry.target.url}`,
					"voice",
				);
				break;
			}
			case "image_hash": {
				const url = entry.target.coverImageURL({ size: 128 });
				await log(
					`${LoggingEmojis.Event} Event ${entry.target.name}’s cover image ${
						url ? "changed" : "removed"
					}${extraAuditLogsInfo(entry)}`,
					"voice",
					{ files: url ? [url] : [] },
				);
			}
		}
	}
}

export async function voiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
	if (!newState.member || newState.guild.id !== config.guild.id) return;

	if (oldState.channel?.id !== newState.channel?.id && !newState.member.user.bot) {
		if (oldState.channel && oldState.channel.type !== ChannelType.GuildStageVoice) {
			await log(
				`${
					LoggingEmojis.Voice
				} ${newState.member.toString()} left voice channel ${oldState.channel.toString()}`,
				"voice",
			);
		}

		if (newState.channel && newState.channel.type !== ChannelType.GuildStageVoice) {
			await log(
				`${
					LoggingEmojis.Voice
				} ${newState.member.toString()} joined voice channel ${newState.channel.toString()}, ${
					newState.mute ? "" : "un"
				}muted and ${newState.deaf ? "" : "un"}deafened`,
				"voice",
			);
		}

		return;
	}

	if (!newState.channel) return;

	if (Boolean(oldState.suppress) !== Boolean(newState.suppress)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} ${
				newState.suppress ? "moved to the audience" : "became a speaker"
			} in ${newState.channel.toString()}`,
			"voice",
		);
	}

	if (newState.suppress && newState.channel?.type === ChannelType.GuildStageVoice) return;

	if (Boolean(oldState.selfDeaf) !== Boolean(newState.selfDeaf)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} ${
				newState.selfDeaf ? "" : "un"
			}deafened in ${newState.channel.toString()}`,
			"voice",
		);
	}

	if (Boolean(oldState.selfMute) !== Boolean(newState.selfMute)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} ${
				newState.selfMute ? "" : "un"
			}muted in ${newState.channel.toString()}`,
			"voice",
		);
	}

	if (Boolean(oldState.selfVideo) !== Boolean(newState.selfVideo)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} turned camera ${
				newState.selfVideo ? "on" : "off"
			} in ${newState.channel.toString()}`,
			"voice",
		);
	}

	if (Boolean(oldState.serverDeaf) !== Boolean(newState.serverDeaf)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} was ${
				newState.serverDeaf ? "" : "un-"
			}server deafened`,
			"voice",
		);
	}

	if (Boolean(oldState.serverMute) !== Boolean(newState.serverMute)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} was ${
				newState.serverMute ? "" : "un-"
			}server muted`,
			"voice",
		);
	}

	if (Boolean(oldState.streaming) !== Boolean(newState.streaming)) {
		await log(
			`${LoggingEmojis.Voice} ${newState.member.toString()} ${
				newState.streaming ? "started" : "stopped"
			} screen sharing in ${newState.channel.toString()}`,
			"voice",
		);
	}
}
export async function guildScheduledEventDelete(event: GuildScheduledEvent) {
	if (event.guildId !== config.guild.id) return;

	await log(`${LoggingEmojis.Event} Event ${event.name} removed`, "voice");
}
