import {
	ChannelType,
	type AuditLogEvent,
	type GuildAuditLogsEntry,
	type AnyThreadChannel,
	ThreadAutoArchiveDuration,
	channelMention,
	ThreadChannel,
} from "discord.js";
import log, { LogSeverity, LoggingEmojis, extraAuditLogsInfo, shouldLog } from "./misc.js";

export async function threadCreate(entry: GuildAuditLogsEntry<AuditLogEvent.ThreadCreate>) {
	if (entry.target.type !== ChannelType.PrivateThread) return;
	await log(
		`${LoggingEmojis.Thread} Private thread ${channelMention(
			entry.target.id,
		)} created${extraAuditLogsInfo(entry)}`,
		LogSeverity.ServerChange,
	);
}
export async function threadDelete(entry: GuildAuditLogsEntry<AuditLogEvent.ThreadDelete>) {
	await log(
		`${LoggingEmojis.Thread} Thread #${entry.target.name} ${
			entry.target instanceof ThreadChannel && entry.target.parent
				? `in ${entry.target.parent.toString()} `
				: ""
		}(ID: ${entry.target.id}) deleted${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}

export async function threadUpdate(oldThread: AnyThreadChannel, newThread: AnyThreadChannel) {
	if (!shouldLog(newThread)) return;

	if (oldThread.archived !== newThread.archived)
		await log(
			`${LoggingEmojis.Thread} ${
				newThread.archived ? `${newThread.url} closed` : `${newThread.toString()} opened`
			}`,
			LogSeverity.ServerChange,
		);

	if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
		await log(
			`${LoggingEmojis.Thread} ${newThread.toString()}’s hide after inactivity set to ${
				{
					[ThreadAutoArchiveDuration.OneHour]: "1 Hour",
					[ThreadAutoArchiveDuration.OneDay]: "24 Hours",
					[ThreadAutoArchiveDuration.ThreeDays]: "3 Days",
					[ThreadAutoArchiveDuration.OneWeek]: "1 Week",
				}[newThread.autoArchiveDuration ?? ThreadAutoArchiveDuration.OneDay]
			}`,
			LogSeverity.ContentEdit,
		);
	}
	const removedActive = newThread.flags.has("ActiveChannelsRemoved");
	if (oldThread.flags.has("ActiveChannelsRemoved") !== removedActive) {
		await log(
			`${LoggingEmojis.Channel} ${newThread.toString()} ${
				removedActive ? "removed from" : "re-added to"
			} Active Channels`,
			LogSeverity.ServerChange,
		);
	}
	const clyde = newThread.flags.has("ClydeAI");
	if (oldThread.flags.has("ClydeAI") !== clyde) {
		await log(
			`${LoggingEmojis.Integration} ClydeAI ${
				clyde ? "enabled" : "disabled"
			} in ${newThread.toString()}`,
			LogSeverity.ContentEdit,
		);
	}
	const removedFeed = newThread.flags.has("GuildFeedRemoved");
	if (oldThread.flags.has("GuildFeedRemoved") !== removedFeed) {
		await log(
			`${LoggingEmojis.Channel} ${newThread.toString()} ${
				removedActive ? "removed from" : "re-added to"
			} the server feed`,
			LogSeverity.ServerChange,
		);
	}
	const spam = newThread.flags.has("IsSpam");
	if (oldThread.flags.has("IsSpam") !== spam) {
		await log(
			`${LoggingEmojis.Channel} ${newThread.toString()} ${spam ? "" : "un"}marked as spam`,
			LogSeverity.ImportantUpdate,
		);
	}
	const pinned = newThread.flags.has("Pinned");
	if (oldThread.flags.has("Pinned") !== pinned) {
		await log(
			`${LoggingEmojis.Thread} ${newThread.toString()} ${
				newThread.flags.has("Pinned") ? "" : "un"
			}pinned in ${newThread.parent?.toString()}!`,
			LogSeverity.ServerChange,
		);
	}

	if (oldThread.locked !== newThread.locked)
		await log(
			`${LoggingEmojis.Thread} ${newThread.toString()} ${
				newThread.locked ? "locked" : "unlocked"
			}`,
			LogSeverity.ServerChange,
		);

	if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
		await log(
			`${LoggingEmojis.Thread} ${newThread.toString()}’s slowmode was set to ${
				newThread.rateLimitPerUser
			} second${newThread.rateLimitPerUser === 1 ? "" : "s"}`,
			LogSeverity.ContentEdit,
		);
	}
}
