import type { AnyThreadChannel, AuditLogEvent } from "discord.js";
import type { AuditLog } from "./util.js";

import { channelMention, ChannelType, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";

import { messageDeleteBulk } from "./messages.js";
import log, { shouldLog } from "./misc.js";
import { extraAuditLogsInfo, LoggingEmojis, LogSeverity } from "./util.js";

export async function threadCreate(entry: AuditLog<AuditLogEvent.ThreadCreate>): Promise<void> {
	if (!(entry.target instanceof ThreadChannel)) {
		await log(
			`${LoggingEmojis.Thread} Unknown thread ${channelMention(
				entry.target.id,
			)} created${extraAuditLogsInfo(entry)}`,
			LogSeverity.ServerChange,
		);
	} else if (entry.target.type === ChannelType.PrivateThread) {
		await log(
			`${
				LoggingEmojis.Thread
			} Private thread ${entry.target.toString()} created${extraAuditLogsInfo(entry)}`,
			LogSeverity.ServerChange,
		);
	}
}
export async function threadDelete(entry: AuditLog<AuditLogEvent.ThreadDelete>): Promise<void> {
	if (entry.target instanceof ThreadChannel)
		await messageDeleteBulk(entry.target.messages.cache, entry.target);

	await log(
		`${LoggingEmojis.Thread} ${
			entry.target.name === "string" ? `Thread #${entry.target.name}` : "Unknown thread"
		}${
			entry.target instanceof ThreadChannel && entry.target.parent ?
				` in ${entry.target.parent.toString()}`
			:	""
		} (ID: ${entry.target.id}) deleted${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}

export async function threadUpdate(
	oldThread: AnyThreadChannel,
	newThread: AnyThreadChannel,
): Promise<void> {
	if (!shouldLog(newThread)) return;

	if (oldThread.archived !== newThread.archived)
		await log(
			`${LoggingEmojis.Thread} ${
				newThread.archived ? `${newThread.url} closed` : `${newThread.toString()} opened`
			}`,
			LogSeverity.ContentEdit,
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
				removedActive ? "hidden in" : "shown in"
			} Active Now`,
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
			}pinned${newThread.parent ? ` in ${newThread.parent.toString()}` : ""}`,
			LogSeverity.ServerChange,
		);
	}

	if (oldThread.locked !== newThread.locked)
		await log(
			`${LoggingEmojis.Thread} ${newThread.toString()} ${
				newThread.locked ? "locked" : "unlocked"
			}`,
			LogSeverity.ContentEdit,
		);

	if ((oldThread.rateLimitPerUser ?? 0) !== (newThread.rateLimitPerUser ?? 0)) {
		await log(
			`${LoggingEmojis.Thread} ${newThread.toString()}’s slowmode was set to ${
				newThread.rateLimitPerUser ?? 0
			} second${newThread.rateLimitPerUser === 1 ? "" : "s"}`,
			LogSeverity.ContentEdit,
		);
	}
}
