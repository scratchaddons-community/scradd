import type { AuditLogEvent, DMChannel, NonThreadGuildBasedChannel } from "discord.js";
import type { AuditLog } from "./util.ts";

import { unifiedDiff } from "difflib";
import {
	BaseChannel,
	channelMention,
	ChannelType,
	ForumLayoutType,
	SortOrderType,
	TextChannel,
	ThreadAutoArchiveDuration,
	VideoQualityMode,
} from "discord.js";
import { formatAnyEmoji } from "strife.js";

import config from "../../common/config.ts";
import { messageDeleteBulk } from "./messages.ts";
import log from "./misc.ts";
import { extraAuditLogsInfo, LoggingEmojis, LogSeverity } from "./util.ts";

export async function channelCreate(entry: AuditLog<AuditLogEvent.ChannelCreate>): Promise<void> {
	await log(
		entry.target instanceof BaseChannel ?
			`${LoggingEmojis.Channel} ${
				{
					[ChannelType.GuildText]: "Text",
					[ChannelType.GuildVoice]: "Voice",
					[ChannelType.GuildCategory]: "Category",
					[ChannelType.GuildAnnouncement]: "Announcement",
					[ChannelType.GuildStageVoice]: "Stage",
					[ChannelType.GuildForum]: "Forum",
					[ChannelType.GuildMedia]: "Media",
				}[entry.target.type]
			} channel ${entry.target.toString()} (#${entry.target.name}) created${
				entry.target.parent ? ` under ${entry.target.parent.toString()}` : ""
			}${extraAuditLogsInfo(entry)}`
		:	`${LoggingEmojis.Channel} Unknown channel ${channelMention(
				entry.target.id,
			)} created${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}
export async function channelDelete(entry: AuditLog<AuditLogEvent.ChannelDelete>): Promise<void> {
	if (entry.target instanceof TextChannel)
		await messageDeleteBulk(entry.target.messages.cache, entry.target);

	await log(
		`${LoggingEmojis.Channel} ${
			typeof entry.target.name === "string" ? `#${entry.target.name}` : "Unknown channel"
		} (ID: ${entry.target.id}) deleted${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}

export async function channelUpdate(
	oldChannel: DMChannel | NonThreadGuildBasedChannel,
	newChannel: DMChannel | NonThreadGuildBasedChannel,
): Promise<void> {
	if (newChannel.isDMBased() || oldChannel.isDMBased() || newChannel.guild.id !== config.guild.id)
		return;

	const removedActive = newChannel.flags.has("ActiveChannelsRemoved");
	if (oldChannel.flags.has("ActiveChannelsRemoved") !== removedActive)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				removedActive ? "hidden from" : "shown in"
			} Active Now`,
			LogSeverity.ServerChange,
		);
	const clyde = newChannel.flags.has("ClydeAI");
	if (oldChannel.flags.has("ClydeAI") !== clyde)
		await log(
			`${LoggingEmojis.Integration} ClydeAI ${
				clyde ? "enabled" : "disabled"
			} in ${newChannel.toString()}`,
			LogSeverity.ServerChange,
		);
	const removedFeed = newChannel.flags.has("GuildFeedRemoved");
	if (oldChannel.flags.has("GuildFeedRemoved") !== removedFeed)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				removedActive ? "removed from" : "re-added to"
			} the server feed`,
			LogSeverity.ServerChange,
		);
	const resource = newChannel.flags.has("IsGuildResourceChannel");
	if (oldChannel.flags.has("IsGuildResourceChannel") !== resource)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				resource ? "added to" : "removed from"
			} the Resource Pages`,
			LogSeverity.ServerChange,
		);
	const spam = newChannel.flags.has("IsSpam");
	if (oldChannel.flags.has("IsSpam") !== spam)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${spam ? "" : "un"}marked as spam`,
			LogSeverity.ImportantUpdate,
		);
	const tags = newChannel.flags.has("RequireTag");
	if (oldChannel.flags.has("RequireTag") !== tags)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} set to ${
				tags ? "" : "not "
			}require people to select tags when posting`,
			LogSeverity.ServerChange,
		);
	if (oldChannel.name !== newChannel.name)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} (${oldChannel.name}) renamed to ${
				newChannel.name
			}`,
			LogSeverity.ImportantUpdate,
		);
	if (oldChannel.type !== newChannel.type)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} converted to a${
				{
					[ChannelType.GuildText]: " Text",
					[ChannelType.GuildVoice]: " Voice",
					[ChannelType.GuildCategory]: " Category",
					[ChannelType.GuildAnnouncement]: "n Announcement",
					[ChannelType.GuildStageVoice]: " Stage",
					[ChannelType.GuildForum]: " Forum",
					[ChannelType.GuildMedia]: " Media",
				}[newChannel.type]
			} Channel`,
			LogSeverity.ImportantUpdate,
		);

	if (
		oldChannel.type === ChannelType.GuildCategory ||
		newChannel.type === ChannelType.GuildCategory
	)
		return;

	if (oldChannel.nsfw !== newChannel.nsfw)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				newChannel.nsfw ? "" : "un"
			}marked as age-restricted`,
			LogSeverity.ImportantUpdate,
		);

	if ((oldChannel.rateLimitPerUser ?? 0) !== (newChannel.rateLimitPerUser ?? 0))
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s ${
				newChannel.isThreadOnly() ? "post " : ""
			}slowmode set to ${newChannel.rateLimitPerUser ?? 0} seconds`,
			LogSeverity.ServerChange,
		);

	if (oldChannel.isVoiceBased() && newChannel.isVoiceBased()) {
		if (oldChannel.bitrate !== newChannel.bitrate)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s bitrate set to ${
					newChannel.bitrate / 1000
				}kbps`,
				LogSeverity.ServerChange,
			);

		if (oldChannel.rtcRegion !== newChannel.rtcRegion)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s region override set to ${
					newChannel.rtcRegion || "Automatic"
				}`,
				LogSeverity.ServerChange,
			);

		if (oldChannel.userLimit !== newChannel.userLimit)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s user limit set to ${
					newChannel.userLimit || "∞"
				} users`,
				LogSeverity.ServerChange,
			);

		if (oldChannel.videoQualityMode !== newChannel.videoQualityMode)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s video quality set to ${
					{ [VideoQualityMode.Auto]: "Auto", [VideoQualityMode.Full]: "720p" }[
						newChannel.videoQualityMode ?? VideoQualityMode.Auto
					]
				}`,
				LogSeverity.ServerChange,
			);
	}

	if (oldChannel.isVoiceBased() || newChannel.isVoiceBased()) return;

	if (oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration)
		await log(
			`${LoggingEmojis.Thread} ${newChannel.toString()}’s hide after inactivity time set to ${
				{
					[ThreadAutoArchiveDuration.OneHour]: "1 Hour",
					[ThreadAutoArchiveDuration.OneDay]: "24 Hours",
					[ThreadAutoArchiveDuration.ThreeDays]: "3 Days",
					[ThreadAutoArchiveDuration.OneWeek]: "1 Week",
				}[newChannel.defaultAutoArchiveDuration ?? ThreadAutoArchiveDuration.OneDay]
			}`,
			LogSeverity.ServerChange,
		);

	if ((oldChannel.topic ?? "") !== (newChannel.topic ?? ""))
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s topic changed`,
			LogSeverity.ServerChange,
			{
				files: [
					{
						content: unifiedDiff(
							(oldChannel.topic ?? "").split("\n"),
							(newChannel.topic ?? "").split("\n"),
							{ lineterm: "" },
						)
							.join("\n")
							.replace(/^-{3} \n\+{3} \n/, ""),

						extension: "diff",
					},
				],
			},
		);

	if (
		(oldChannel.defaultThreadRateLimitPerUser ?? 0) !==
		(newChannel.defaultThreadRateLimitPerUser ?? 0)
	)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s message slowmode set to ${
				newChannel.defaultThreadRateLimitPerUser ?? 0
			} seconds`,
			LogSeverity.ServerChange,
		);

	if (!oldChannel.isThreadOnly() || !newChannel.isThreadOnly()) return;

	if (
		oldChannel.defaultReactionEmoji?.id !== newChannel.defaultReactionEmoji?.id ||
		(oldChannel.defaultReactionEmoji?.name !== newChannel.defaultReactionEmoji?.name &&
			!newChannel.defaultReactionEmoji?.id)
	) {
		const emoji = formatAnyEmoji(newChannel.defaultReactionEmoji);
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s default reaction was ${
				emoji ? `set to ${emoji}` : "removed"
			}`,
			LogSeverity.ServerChange,
		);
	}

	if (oldChannel.defaultSortOrder !== newChannel.defaultSortOrder)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s sort order set to ${
				{
					[SortOrderType.CreationDate]: "Creation Time",
					[SortOrderType.LatestActivity]: "Recent Activity",
				}[newChannel.defaultSortOrder ?? SortOrderType.LatestActivity]
			}`,
			LogSeverity.ServerChange,
		);

	if (oldChannel.type !== ChannelType.GuildForum || newChannel.type !== ChannelType.GuildForum)
		return;

	if (oldChannel.defaultForumLayout !== newChannel.defaultForumLayout)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s default layout set to ${
				{ [ForumLayoutType.ListView]: "List", [ForumLayoutType.GalleryView]: "Gallery" }[
					newChannel.defaultForumLayout || ForumLayoutType.ListView
				]
			} View`,
			LogSeverity.ServerChange,
		);
}
