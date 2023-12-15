import { unifiedDiff } from "difflib";
import {
	type GuildAuditLogsEntry,
	type AuditLogEvent,
	Base,
	ChannelType,
	AuditLogOptionsType,
	userMention,
	roleMention,
	channelMention,
	DMChannel,
	ForumLayoutType,
	type NonThreadGuildBasedChannel,
	SortOrderType,
	ThreadAutoArchiveDuration,
	VideoQualityMode,
} from "discord.js";
import config from "../../common/config.js";
import log, { LogSeverity, LoggingEmojis, extraAuditLogsInfo } from "./misc.js";

export async function channelCreate(entry: GuildAuditLogsEntry<AuditLogEvent.ChannelCreate>) {
	if (!(entry.target instanceof Base)) return;
	await log(
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
			entry.target.parent ? ` under ${entry.target.parent}` : ""
		}${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}
export async function channelDelete(entry: GuildAuditLogsEntry<AuditLogEvent.ChannelDelete>) {
	await log(
		`${LoggingEmojis.Channel} #${entry.target.name} (ID: ${
			entry.target.id
		}) deleted${extraAuditLogsInfo(entry)}`,
		LogSeverity.ImportantUpdate,
	);
}
export async function channelOverwriteCreate(
	entry: GuildAuditLogsEntry<AuditLogEvent.ChannelOverwriteCreate>,
) {
	await log(
		`${LoggingEmojis.Channel} Permissions for ${
			entry.extra instanceof Base
				? entry.extra.toString()
				: entry.extra.type === AuditLogOptionsType.Member
				? userMention(entry.extra.id)
				: roleMention(entry.extra.id)
		} in ${channelMention(entry.target.id)} changed${extraAuditLogsInfo(entry)}`,
		LogSeverity.ServerChange,
	);
}
export async function channelOverwriteUpdate(
	entry: GuildAuditLogsEntry<AuditLogEvent.ChannelOverwriteUpdate>,
) {
	await log(
		`${LoggingEmojis.Channel} Permissions for ${
			entry.extra instanceof Base
				? entry.extra.toString()
				: entry.extra.type === AuditLogOptionsType.Member
				? userMention(entry.extra.id)
				: roleMention(entry.extra.id)
		} in ${channelMention(entry.target.id)} changed${extraAuditLogsInfo(entry)}`,
		LogSeverity.ServerChange,
	);
}
export async function channelOverwriteDelete(
	entry: GuildAuditLogsEntry<AuditLogEvent.ChannelOverwriteDelete>,
) {
	await log(
		`${LoggingEmojis.Channel} Permissions for ${
			entry.extra instanceof Base
				? entry.extra.toString()
				: entry.extra.type === AuditLogOptionsType.Member
				? userMention(entry.extra.id)
				: roleMention(entry.extra.id)
		} in ${channelMention(entry.target.id)} changed${extraAuditLogsInfo(entry)}`,
		LogSeverity.ServerChange,
	);
}

export async function channelUpdate(
	oldChannel: DMChannel | NonThreadGuildBasedChannel,
	newChannel: DMChannel | NonThreadGuildBasedChannel,
) {
	if (newChannel.isDMBased() || oldChannel.isDMBased() || newChannel.guild.id !== config.guild.id)
		return;

	const removedActive = newChannel.flags.has("ActiveChannelsRemoved");
	if (oldChannel.flags.has("ActiveChannelsRemoved") !== removedActive) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				removedActive ? "removed from" : "re-added to"
			} Active Channels`,
			LogSeverity.ServerChange,
		);
	}
	const clyde = newChannel.flags.has("ClydeAI");
	if (oldChannel.flags.has("ClydeAI") !== clyde) {
		await log(
			`${LoggingEmojis.Integration} ClydeAI ${
				clyde ? "enabled" : "disabled"
			} in ${newChannel.toString()}`,
			LogSeverity.ServerChange,
		);
	}
	const removedFeed = newChannel.flags.has("GuildFeedRemoved");
	if (oldChannel.flags.has("GuildFeedRemoved") !== removedFeed) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				removedActive ? "removed from" : "re-added to"
			} the server feed`,
			LogSeverity.ServerChange,
		);
	}
	const resource = newChannel.flags.has("IsGuildResourceChannel");
	if (oldChannel.flags.has("IsGuildResourceChannel") !== resource) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				resource ? "added to" : "removed from"
			} the Resource Pages`,
			LogSeverity.ServerChange,
		);
	}
	const spam = newChannel.flags.has("IsSpam");
	if (oldChannel.flags.has("IsSpam") !== spam) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${spam ? "" : "un"}marked as spam`,
			LogSeverity.ImportantUpdate,
		);
	}
	const tags = newChannel.flags.has("RequireTag");
	if (oldChannel.flags.has("RequireTag") !== tags) {
		await log(
			`${LoggingEmojis.Channel} “Require people to select tags when posting” ${
				tags ? "enabled" : "disabled"
			} in ${newChannel.toString()}`,
			LogSeverity.ServerChange,
		);
	}
	if (oldChannel.name !== newChannel.name)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} (${oldChannel.name}) renamed to ${
				newChannel.name
			}`,
			LogSeverity.ImportantUpdate,
		);
	if (oldChannel.rawPosition !== newChannel.rawPosition)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} moved to position ${
				newChannel.rawPosition
			}`,
			LogSeverity.ServerChange,
		);
	if (oldChannel.type !== newChannel.type) {
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
	}

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

	if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s ${
				newChannel.isThreadOnly() ? "post " : ""
			}slowmode set to ${newChannel.rateLimitPerUser} seconds`,
			LogSeverity.ServerChange,
		);

	if (oldChannel.isVoiceBased() && newChannel.isVoiceBased()) {
		if (oldChannel.bitrate !== newChannel.bitrate)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s bitrate set to ${
					newChannel.bitrate
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

	if ((oldChannel.topic ?? "") !== (newChannel.topic ?? "")) {
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
	}

	if (!oldChannel.isThreadOnly() || oldChannel.type !== newChannel.type) return;

	if (
		oldChannel.defaultReactionEmoji?.id !== newChannel.defaultReactionEmoji?.id ||
		oldChannel.defaultReactionEmoji?.name !== newChannel.defaultReactionEmoji?.name
	) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s default reaction was ${
				newChannel.defaultReactionEmoji
					? `set to ${
							newChannel.defaultReactionEmoji.name ||
							`<:_:${newChannel.defaultReactionEmoji.id}>`
					  }`
					: "removed"
			}`,
			LogSeverity.ServerChange,
		);
	}

	if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s message slowmode set to ${
				newChannel.defaultThreadRateLimitPerUser
			} seconds`,
			LogSeverity.ServerChange,
		);

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
