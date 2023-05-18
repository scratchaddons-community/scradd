import {
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	GuildMFALevel,
	GuildNSFWLevel,
	time,
	Locale,
	GuildSystemChannelFlags,
	GuildVerificationLevel,
	ChannelType,
	AuditLogEvent,
	GuildAuditLogsEntry,
	Base,
	TimestampStyles,
	APIRole,
	roleMention,
	Colors,
	channelMention,
	userMention,
	AuditLogOptionsType,
	WebhookType,
	VideoQualityMode,
	ThreadAutoArchiveDuration,
	SortOrderType,
	ForumLayoutType,
	formatEmoji,
	APIEmoji,
	APISticker,
	APIGuildScheduledEvent,
	AutoModerationRuleTriggerType,
} from "discord.js";
import config from "../../common/config.js";
import defineEvent from "../../lib/events.js";
import log, { getLoggingThread, LoggingEmojis, shouldLog } from "./misc.js";
import { DATABASE_THREAD } from "../../common/database.js";
import {
	extractMessageExtremities,
	getBaseChannel,
	getMessageJSON,
	messageToText,
} from "../../util/discord.js";
import { unifiedDiff } from "difflib";
import { diffString } from "json-diff";
import { joinWithAnd } from "../../util/text.js";

const databaseThread = await getLoggingThread(DATABASE_THREAD);

function extraAuditLogsInfo(entry: GuildAuditLogsEntry) {
	return `${entry.executor ? ` by ${entry.executor.toString()}` : ""}${
		entry.reason ? ` (${entry.reason})` : ""
	} ✨` as const;
}

// for (const change of entry.changes) {
// 	const key = change.key as Extract<typeof change.key, keyof ___>;
// 	switch (key) {
// 	}
// }

const events: {
	[event in AuditLogEvent]?: (entry: GuildAuditLogsEntry<event>) => void | Promise<void>;
} = {
	async [AuditLogEvent.ChannelCreate](entry) {
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
				}[entry.target.type]
			} channel ${entry.target.toString()} (#${entry.target.name}) created${
				entry.target.parent ? ` under ${entry.target.parent}` : ""
			}${extraAuditLogsInfo(entry)}`,
			"channels",
		);
	},
	async [AuditLogEvent.ChannelDelete](entry) {
		await log(
			`${LoggingEmojis.Channel} #${entry.target.name} deleted${extraAuditLogsInfo(
				entry,
			)} (ID: ${entry.target.id})`,
			"channels",
		);
	},
	async [AuditLogEvent.ChannelOverwriteCreate](entry) {
		await log(
			`${LoggingEmojis.Channel} Permissions for ${
				entry.extra instanceof Base
					? entry.extra.toString()
					: entry.extra.type === AuditLogOptionsType.Member
					? userMention(entry.extra.id)
					: roleMention(entry.extra.id)
			} in ${channelMention(entry.target.id)} updated${extraAuditLogsInfo(entry)}`,
			"channels",
		);
	},
	async [AuditLogEvent.ChannelOverwriteUpdate](entry) {
		await log(
			`${LoggingEmojis.Channel} Permissions for ${
				entry.extra instanceof Base
					? entry.extra.toString()
					: entry.extra.type === AuditLogOptionsType.Member
					? userMention(entry.extra.id)
					: roleMention(entry.extra.id)
			} in ${channelMention(entry.target.id)} updated${extraAuditLogsInfo(entry)}`,
			"channels",
		);
	},
	async [AuditLogEvent.ChannelOverwriteDelete](entry) {
		await log(
			`${LoggingEmojis.Channel} Permissions for ${
				entry.extra instanceof Base
					? entry.extra.toString()
					: entry.extra.type === AuditLogOptionsType.Member
					? userMention(entry.extra.id)
					: roleMention(entry.extra.id)
			} in ${channelMention(entry.target.id)} updated${extraAuditLogsInfo(entry)}`,
			"channels",
		);
	},
	async [AuditLogEvent.MemberKick](entry) {
		if (!entry.target) return;
		await log(
			`${LoggingEmojis.Punishment} ${entry.target.toString()} kicked${extraAuditLogsInfo(
				entry,
			)}`,
			"members",
		);
	},
	async [AuditLogEvent.MemberPrune](entry) {
		await log(
			`${LoggingEmojis.Punishment} ${entry.extra.removed} members who haven’t talked in ${
				entry.extra.days
			} days pruned${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	async [AuditLogEvent.MemberBanAdd](entry) {
		if (!entry.target) return;
		await log(
			`${LoggingEmojis.Punishment} ${entry.target.toString()} banned${extraAuditLogsInfo(
				entry,
			)}`,
			"members",
		);
	},
	async [AuditLogEvent.MemberBanRemove](entry) {
		if (!entry.target) return;
		await log(
			`${LoggingEmojis.Punishment} ${entry.target.toString()} unbanned${extraAuditLogsInfo(
				entry,
			)}`,
			"members",
		);
	},
	async [AuditLogEvent.MemberRoleUpdate](entry) {
		if (!entry.target) return;

		const addedRoles = entry.changes
			.filter((change): change is { key: "$add"; new: APIRole[] } => change.key === "$add")
			.map((change) => change.new)
			.flat();

		const removedRoles = entry.changes
			.filter(
				(change): change is { key: "$remove"; new: APIRole[] } => change.key === "$remove",
			)
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
	},
	async [AuditLogEvent.BotAdd](entry) {
		if (!entry.target) return;
		await log(
			`${LoggingEmojis.Bot} ${entry.target.toString()} added${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	async [AuditLogEvent.RoleUpdate](entry) {},
	async [AuditLogEvent.InviteCreate](entry) {
		await log(
			`${LoggingEmojis.Invite} ${entry.target.temporary ? "Temporary invite" : "Invite"} ${
				entry.target.code
			} for ${entry.target.channel?.toString()} created${
				entry.executor ? ` by ${entry.executor.toString()}` : ""
			}${
				entry.target.expiresAt || entry.target.maxUses
					? `, expiring ${
							entry.target.expiresAt
								? time(entry.target.expiresAt, TimestampStyles.LongDate)
								: ""
					  }${entry.target.expiresAt && entry.target.maxUses ? " or " : ""}${
							entry.target.maxUses ? `after ${entry.target.maxUses} uses` : ""
					  }`
					: ""
			}${entry.reason ? ` (${entry.reason})` : ""}`,
			"server",
		);
	},
	async [AuditLogEvent.WebhookCreate](entry) {
		if (entry.target.type !== WebhookType.Incoming) return;
		await log(
			`${LoggingEmojis.Integration} Webhook ${entry.target.name} created${extraAuditLogsInfo(
				entry,
			)}`,
			"server",
		);
	},
	async [AuditLogEvent.WebhookUpdate](entry) {},
	async [AuditLogEvent.WebhookDelete](entry) {
		await log(
			`${LoggingEmojis.Integration} Webhook ${entry.target.name} deleted${extraAuditLogsInfo(
				entry,
			)}`,
			"server",
		);
	},
	async [AuditLogEvent.EmojiCreate](entry) {
		if (!(entry.target instanceof Base)) return;
		await log(
			`${LoggingEmojis.Emoji} ${entry.target.toString()} created${extraAuditLogsInfo(
				entry,
			)} (ID: ${entry.target.id})`,
			"server",
		);
	},
	async [AuditLogEvent.EmojiUpdate](entry) {
		for (const change of entry.changes) {
			if (change.key !== "name") return;
			await log(
				`${LoggingEmojis.Emoji} ${formatEmoji(entry.target?.id ?? "")} (:${
					change.old
				}:) renamed to :${change.new}:${extraAuditLogsInfo(entry)} (ID: ${
					entry.target?.id
				})`,
				"server",
			);
		}
	},
	async [AuditLogEvent.EmojiDelete](entry) {
		if (!entry.target) return;
		await log(
			`${LoggingEmojis.Emoji} :${
				"name" in entry.target
					? entry.target.name
					: entry.changes.find((change) => change.key === "name")?.old
			}: deleted${extraAuditLogsInfo(entry)} (ID: ${entry.target.id})`,
			"server",
		);
	},
	async [AuditLogEvent.IntegrationCreate](entry) {
		await log(
			`${LoggingEmojis.Integration} ${entry.target.name} added${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	async [AuditLogEvent.IntegrationUpdate](entry) {},
	async [AuditLogEvent.IntegrationDelete](entry) {
		await log(
			`${LoggingEmojis.Integration} ${entry.target.name} removed${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	async [AuditLogEvent.StickerCreate](entry) {
		await log(
			`${LoggingEmojis.Emoji} Sticker ${entry.target.name} created${extraAuditLogsInfo(
				entry,
			)} (ID: ${entry.target.id})`,
			"server",
			{ files: [entry.target.url] },
		);
	},
	async [AuditLogEvent.StickerUpdate](entry) {
		for (const change of entry.changes) {
			const key = change.key as Extract<typeof change.key, keyof APISticker>;
			switch (key) {
				case "name": {
					await log(
						`${LoggingEmojis.Emoji} Sticker ${entry.target.name} (:${
							change.old
						}:) renamed to :${change.new}:${extraAuditLogsInfo(entry)} (ID: ${entry.target.id})`,
						"server",
					);
					break;
				}
				case "description": {
					await log(
						`${LoggingEmojis.Emoji} Sticker ${
							entry.target.name
						}’s description changed${extraAuditLogsInfo(entry)} (ID: ${entry.target.id})`,
						"server",
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
				}
				case "tags": {
					await log(
						`${LoggingEmojis.Emoji} Sticker ${entry.target.name}’s related emoji ${
							change.new ? `set to ${change.new}` : "removed"
						}${extraAuditLogsInfo(entry)} (ID: ${entry.target.id})`,
						"server",
					);
				}
			}
		}
	},
	async [AuditLogEvent.StickerDelete](entry) {
		await log(
			`${LoggingEmojis.Emoji} Sticker ${entry.target.name} deleted${extraAuditLogsInfo(
				entry,
			)} (ID: ${entry.target.id})`,
			"server",
			{ files: [entry.target.url] },
		);
	},
	async [AuditLogEvent.GuildScheduledEventCreate](entry) {
		await log(
			`${LoggingEmojis.Event} Event scheduled${extraAuditLogsInfo(entry)}\n${
				entry.target.url
			}`,
			"voice",
		);
	},
	async [AuditLogEvent.GuildScheduledEventUpdate](entry) {
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
	},
	async [AuditLogEvent.ThreadCreate](entry) {
		if (entry.target.type !== ChannelType.PrivateThread) return;
		await log(
			`${
				LoggingEmojis.Thread
			} Private thread ${entry.target.toString()} created${extraAuditLogsInfo(entry)}`,
			"channels",
			typeof entry.target.url === "string"
				? { button: { label: "View Thread", url: entry.target.url } }
				: undefined,
		);
	},
	async [AuditLogEvent.ThreadUpdate](entry) {},
	async [AuditLogEvent.ThreadDelete](entry) {
		await log(
			`${LoggingEmojis.Thread} Thread #${entry.target.name} ${
				entry.target.parent ? `in ${entry.target.parent.toString()} ` : ""
			}deleted${extraAuditLogsInfo(entry)} (ID: ${entry.target.id})`,
			"channels",
		);
	},
	async [AuditLogEvent.ApplicationCommandPermissionUpdate](entry) {
		await log(
			`${LoggingEmojis.Integration} Permissions for ${userMention(
				entry.extra.applicationId,
			)}’s commands updated${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	async [AuditLogEvent.AutoModerationRuleCreate](entry) {
		await log(
			`${
				LoggingEmojis.Thread
			} AutoMod "${{
				[ AutoModerationRuleTriggerType.Keyword ]: "Block Custom Words",
				[ AutoModerationRuleTriggerType.Spam ]: "Block Suspected Spam Content",
				[ AutoModerationRuleTriggerType.KeywordPreset ]: "Block Commonly Flagged Words",
				[ AutoModerationRuleTriggerType.MentionSpam ]: "Block Mention Spam",
			}[ entry.target.triggerType ]}" Rule ${entry.target.name} created${extraAuditLogsInfo(entry)} (ID: ${entry.target.id})`,
			"server",
		);},
	async [AuditLogEvent.AutoModerationRuleUpdate](entry) {},
	async [AuditLogEvent.AutoModerationRuleDelete](entry) {
		await log(
			`${LoggingEmojis.Thread} AutoMod Rule ${entry.target.name} created${extraAuditLogsInfo(entry)} (ID: ${entry.target.id})`,
			"server",
		);},
};

defineEvent("channelUpdate", async (oldChannel, newChannel) => {
	if (newChannel.isDMBased() || oldChannel.isDMBased() || newChannel.guild.id !== config.guild.id)
		return;

	const removedActive = !!newChannel.flags?.has("ActiveChannelsRemoved");
	if (!!oldChannel.flags?.has("ActiveChannelsRemoved") !== removedActive) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				removedActive ? "removed from" : "re-added to"
			} Active Channels`,
			"members",
		);
	}
	const clyde = !!newChannel.flags?.has("ClydeAI");
	if (!!oldChannel.flags?.has("ClydeAI") !== clyde) {
		await log(
			`${LoggingEmojis.Integration} ClydeAI ${
				clyde ? "enabled" : "disabled"
			} in ${newChannel.toString()}`,
			"members",
		);
	}
	const removedFeed = !!newChannel.flags?.has("GuildFeedRemoved");
	if (!!oldChannel.flags?.has("GuildFeedRemoved") !== removedFeed) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				removedActive ? "removed from" : "re-added to"
			} Server Feed`,
			"members",
		);
	}
	const resource = !!newChannel.flags?.has("IsGuildResourceChannel");
	if (!!oldChannel.flags?.has("IsGuildResourceChannel") !== resource) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${
				resource ? "" : "un"
			}made a Resource Page`,
			"members",
		);
	}
	const spam = !!newChannel.flags?.has("IsSpam");
	if (!!oldChannel.flags?.has("IsSpam") !== spam) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} ${spam ? "" : "un"}marked as spam`,
			"members",
		);
	}
	const tags = !!newChannel.flags?.has("RequireTag");
	if (!!oldChannel.flags?.has("RequireTag") !== tags) {
		await log(
			`${LoggingEmojis.Channel} "Require people to select tags when posting" ${
				tags ? "enabled" : "disabled"
			} in ${newChannel.toString()}`,
			"members",
		);
	}
	if (oldChannel.name !== newChannel.name)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} (${oldChannel.name}) renamed to ${
				newChannel.name
			}`,
			"channels",
		);
	if (oldChannel.rawPosition !== newChannel.rawPosition)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} moved to position ${
				newChannel.rawPosition
			}`,
			"channels",
		);
	if (oldChannel.type !== newChannel.type) {
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} made into a${
				{
					[ChannelType.GuildText]: " Text",
					[ChannelType.GuildVoice]: " Voice",
					[ChannelType.GuildCategory]: " Category",
					[ChannelType.GuildAnnouncement]: "n Announcement",
					[ChannelType.GuildStageVoice]: " Stage",
					[ChannelType.GuildForum]: " Forum",
				}[newChannel.type]
			} Channel`,
			"channels",
		);
	}

	if (
		oldChannel.type === ChannelType.GuildCategory ||
		newChannel.type === ChannelType.GuildCategory
	)
		return;

	if (oldChannel.nsfw !== newChannel.nsfw)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()} made ${
				newChannel.nsfw ? "" : "non-"
			}age-restricted`,
			"channels",
		);

	if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s ${
				newChannel.type === ChannelType.GuildForum ? "post " : ""
			}slowmode set to ${newChannel.rateLimitPerUser} seconds`,
			"channels",
		);

	if (oldChannel.isVoiceBased() && newChannel.isVoiceBased()) {
		if (oldChannel.bitrate !== newChannel.bitrate)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s bitrate set to ${
					newChannel.bitrate
				}kbps`,
				"channels",
			);

		if (oldChannel.rtcRegion !== newChannel.rtcRegion)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s region override set to ${
					newChannel.rtcRegion || "Automatic"
				}`,
				"channels",
			);

		if (oldChannel.userLimit !== newChannel.userLimit)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s user limit set to ${
					newChannel.userLimit ?? "∞"
				} users`,
				"channels",
			);

		if (oldChannel.videoQualityMode !== newChannel.videoQualityMode)
			await log(
				`${LoggingEmojis.Channel} ${newChannel.toString()}’s video quality set to ${
					{ [VideoQualityMode.Auto]: "Auto", [VideoQualityMode.Full]: "720p" }[
						newChannel.videoQualityMode ?? VideoQualityMode.Auto
					]
				}`,
				"channels",
			);
	}

	if (oldChannel.isVoiceBased() || newChannel.isVoiceBased()) return;

	if (oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration)
		await log(
			`${
				LoggingEmojis.Channel
			} ${newChannel.toString()}’s hide after inactivity time set to ${
				{
					[ThreadAutoArchiveDuration.OneHour]: "1 Hour",
					[ThreadAutoArchiveDuration.OneDay]: "24 Hours",
					[ThreadAutoArchiveDuration.ThreeDays]: "3 Days",
					[ThreadAutoArchiveDuration.OneWeek]: "1 Week",
				}[newChannel.defaultAutoArchiveDuration ?? ThreadAutoArchiveDuration.OneDay]
			}`,
			"channels",
		);

	if ((oldChannel.topic ?? "") !== (newChannel.topic ?? "")) {
		await log(`${LoggingEmojis.Channel} ${newChannel.toString()}’s topic changed`, "channels", {
			files: [
				{
					content: unifiedDiff(
						(oldChannel.topic ?? "").split("\n"),
						(newChannel.topic ?? "").split("\n"),
						{ lineterm: "" },
					)
						.join("\n")
						.replace(/^--- \n\+\+\+ \n/, ""),

					extension: "diff",
				},
			],
		});
	}

	if (oldChannel.type !== ChannelType.GuildForum || newChannel.type !== ChannelType.GuildForum)
		return;

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
			"channels",
		);
	}

	if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s message slowmode set to ${
				newChannel.defaultThreadRateLimitPerUser
			} seconds`,
			"channels",
		);

	if (oldChannel.defaultSortOrder !== newChannel.defaultSortOrder)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s sort order set to ${
				{
					[SortOrderType.CreationDate]: "Creation Time",
					[SortOrderType.LatestActivity]: "Recent Activity",
				}[newChannel.defaultSortOrder ?? SortOrderType.LatestActivity]
			}`,
			"channels",
		);

	if (oldChannel.defaultForumLayout !== newChannel.defaultForumLayout)
		await log(
			`${LoggingEmojis.Channel} ${newChannel.toString()}’s default layout set to ${
				{
					[ForumLayoutType.ListView]: "List",
					[ForumLayoutType.GalleryView]: "Gallery",
				}[newChannel.defaultForumLayout || ForumLayoutType.ListView]
			} View`,
			"channels",
		);
});

defineEvent("guildAuditLogEntryCreate", async (entry, guild) => {
	// @ts-expect-error T2345 -- No concrete fix to this
	if (guild.id === config.guild.id) events[entry.action]?.(entry);
});

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Member} ${member.toString()} joined`, "members");
});

defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Member} ${member.toString()} left`, "members");
});

defineEvent("guildMemberUpdate", async (oldMember, newMember) => {
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
});

defineEvent("guildScheduledEventDelete", async (event) => {
	if (event.guildId !== config.guild.id) return;

	await log(`${LoggingEmojis.Event} Event ${event.name} removed`, "voice");
});

defineEvent("guildUpdate", async (oldGuild, newGuild) => {
	if (newGuild.id !== config.guild.id) return;

	if (oldGuild.afkChannel?.id !== newGuild.afkChannel?.id) {
		await log(
			`${LoggingEmojis.SettingChange} Inactive channel set to ${
				newGuild.afkChannel?.toString() ?? "No inactive channel"
			}`,
			"server",
		);
	}
	if (oldGuild.afkTimeout !== newGuild.afkTimeout)
		await log(
			`${LoggingEmojis.SettingChange} Inactive timeout set to ${newGuild.afkTimeout} seconds`,
			"server",
		);

	if (oldGuild.banner !== newGuild.banner) {
		const url = newGuild.bannerURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingChange} Server banner background was ${
				url ? "changed" : "removed"
			}`,
			"server",
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
		await log(
			`${LoggingEmojis.SettingChange} Default notification settings set to “${
				{
					[GuildDefaultMessageNotifications.AllMessages]: "All messages",
					[GuildDefaultMessageNotifications.OnlyMentions]: "Only @mentions",
				}[newGuild.defaultMessageNotifications]
			}”`,
			"server",
		);
	}
	if (oldGuild.description !== newGuild.description) {
		await log(`${LoggingEmojis.SettingChange} Server description changed`, "server", {
			files: [
				{
					content: unifiedDiff(
						oldGuild.description?.split("\n") ?? "",
						newGuild.description?.split("\n") ?? "",
						{ lineterm: "" },
					)
						.join("\n")
						.replace(/^--- \n\+\+\+ \n/, ""),
					extension: "diff",
				},
			],
		});
	}
	if (oldGuild.discoverySplash !== newGuild.discoverySplash) {
		const url = newGuild.discoverySplashURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingChange} Server discovery listing cover image ${
				url ? "changed" : "removed"
			}`,
			"server",
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
		await log(
			`${LoggingEmojis.SettingChange} Explicit image filter set to “${
				{
					[GuildExplicitContentFilter.Disabled]: "Do not filter",
					[GuildExplicitContentFilter.MembersWithoutRoles]:
						"Filter messages from server members without roles",
					[GuildExplicitContentFilter.AllMembers]: "Filter messages from all members",
				}[newGuild.explicitContentFilter]
			}”`,
			"server",
		);
	}
	const community = newGuild.features.includes("COMMUNITY");
	if (oldGuild.features.includes("COMMUNITY") !== community)
		await log(
			`${LoggingEmojis.SettingChange} Community ${community ? "enabled" : "disabled"}`,
			"server",
		);
	else {
		if (oldGuild.publicUpdatesChannel?.id !== newGuild.publicUpdatesChannel?.id) {
			await log(
				`${LoggingEmojis.SettingChange} Community updates channel ${
					newGuild.publicUpdatesChannel
						? `set to ${newGuild.publicUpdatesChannel.toString()}`
						: "unset"
				}`,
				"server",
			);
		}
		if (oldGuild.rulesChannel?.id !== newGuild.rulesChannel?.id) {
			await log(
				`${LoggingEmojis.SettingChange} Rules or guidelines channel ${
					newGuild.rulesChannel ? `set to ${newGuild.rulesChannel.toString()}` : "unset"
				}`,
				"server",
			);
		}
	}
	const monetized = newGuild.features.includes("CREATOR_MONETIZABLE_PROVISIONAL");
	if (oldGuild.features.includes("CREATOR_MONETIZABLE_PROVISIONAL") !== monetized)
		await log(
			`${LoggingEmojis.SettingChange} Monetization ${monetized ? "enabled" : "disabled"}`,
			"server",
		);
	const storePage = newGuild.features.includes("CREATOR_STORE_PAGE");
	if (oldGuild.features.includes("CREATOR_STORE_PAGE") !== storePage)
		await log(
			`${LoggingEmojis.SettingChange} Server Subscription Promo Page ${
				storePage ? "enabled" : "disabled"
			}`,
			"server",
		);
	const developerSupport = newGuild.features.includes("DEVELOPER_SUPPORT_SERVER");
	if (oldGuild.features.includes("DEVELOPER_SUPPORT_SERVER") !== developerSupport)
		await log(
			`${LoggingEmojis.SettingChange} Server ${
				developerSupport ? "" : "un"
			}marked as a Developer Support Server`,
			"server",
		);
	const discoverable = newGuild.features.includes("DISCOVERABLE");
	if (oldGuild.features.includes("DISCOVERABLE") !== discoverable)
		await log(
			`${LoggingEmojis.SettingChange} Discovery ${discoverable ? "enabled" : "disabled"}`,
			"server",
		);
	const featured = newGuild.features.includes("FEATURABLE");
	if (oldGuild.features.includes("FEATURABLE") !== featured)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${
				featured ? "" : "un"
			}featured in Server Discovery`,
			"server",
		);
	const directory = newGuild.features.includes("HAS_DIRECTORY_ENTRY");
	if (oldGuild.features.includes("HAS_DIRECTORY_ENTRY") !== directory)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${
				directory ? "added" : "removed"
			} to a directory channel`,
			"server",
		);
	const invitesDisabled = newGuild.features.includes("INVITES_DISABLED");
	if (oldGuild.features.includes("INVITES_DISABLED") !== invitesDisabled)
		await log(`${LoggingEmojis.Invite} Invites ${invitesDisabled ? "" : "un"}paused`, "server");
	const hub = newGuild.features.includes("LINKED_TO_HUB");
	if (oldGuild.features.includes("LINKED_TO_HUB") !== hub)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${hub ? "added" : "removed"} from a Student Hub`,
			"server",
		);
	const screening = newGuild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED");
	if (oldGuild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED") !== screening)
		await log(
			`${
				LoggingEmojis.SettingChange
			} “Members must accept rules before they can talk or DM” ${
				screening ? "enabled" : "disabled"
			}`,
			"server",
		);
	const subscriptions = newGuild.features.includes("ROLE_SUBSCRIPTIONS_ENABLED");
	if (oldGuild.features.includes("ROLE_SUBSCRIPTIONS_ENABLED") !== subscriptions)
		await log(
			`${LoggingEmojis.SettingChange} Role Subscriptions ${
				subscriptions ? "enabled" : "disabled"
			}`,
			"server",
		);
	const ticketedEvents = newGuild.features.includes("TICKETED_EVENTS_ENABLED");
	if (oldGuild.features.includes("TICKETED_EVENTS_ENABLED") !== ticketedEvents)
		await log(
			`${LoggingEmojis.SettingChange} Ticketed events ${
				ticketedEvents ? "enabled" : "disabled"
			}`,
			"server",
		);
	const welcomeScreen = newGuild.features.includes("WELCOME_SCREEN_ENABLED");
	if (oldGuild.features.includes("WELCOME_SCREEN_ENABLED") !== welcomeScreen)
		await log(
			`${LoggingEmojis.SettingChange} Welcome Screen ${
				welcomeScreen ? "enabled" : "disabled"
			}`,
			"server",
		);

	if (oldGuild.icon !== newGuild.icon) {
		const url = newGuild.iconURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingChange} Server icon ${url ? "changed" : "removed"}`,
			"server",
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.maximumMembers !== newGuild.maximumMembers) {
		await log(
			`${LoggingEmojis.ServerUpdate} Maximum members set to ${newGuild.maximumMembers}`,
			"server",
		);
	}
	if (oldGuild.maxStageVideoChannelUsers !== newGuild.maxStageVideoChannelUsers) {
		await log(
			`${LoggingEmojis.ServerUpdate} Maximum members in a stage video channel set to ${newGuild.maxStageVideoChannelUsers}`,
			"server",
		);
	}
	if (oldGuild.maxVideoChannelUsers !== newGuild.maxVideoChannelUsers) {
		await log(
			`${LoggingEmojis.ServerUpdate} Maximum members in a video channel set to ${newGuild.maxVideoChannelUsers}`,
			"server",
		);
	}
	if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
		await log(
			`${LoggingEmojis.SettingChange} “Require 2FA for moderator actions” ${
				{ [GuildMFALevel.None]: "disabled", [GuildMFALevel.Elevated]: "enabled" }[
					newGuild.mfaLevel
				]
			}`,
			"server",
		);
	}
	if (oldGuild.name !== newGuild.name)
		await log(`${LoggingEmojis.SettingChange} Server renamed to ${newGuild.name}`, "server");

	if (oldGuild.nsfwLevel !== newGuild.nsfwLevel) {
		await log(
			`${LoggingEmojis.ServerUpdate} Server marked as ${
				{
					[GuildNSFWLevel.Default]: "unreviewed",
					[GuildNSFWLevel.Explicit]: "18+",
					[GuildNSFWLevel.Safe]: "safe",
					[GuildNSFWLevel.AgeRestricted]: "13+",
				}[newGuild.nsfwLevel]
			}`,
			"server",
		);
	}
	if (oldGuild.ownerId !== newGuild.ownerId)
		await log(
			`${LoggingEmojis.SettingChange} Ownership transferred to <@${newGuild.ownerId}>`,
			"server",
		);

	if (oldGuild.partnered !== newGuild.partnered)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${newGuild.partnered ? "" : "un"}partnered`,
			"server",
		);

	if (oldGuild.preferredLocale !== newGuild.preferredLocale)
		await log(
			`${LoggingEmojis.SettingChange} Server primary language set to ${
				{
					[Locale.Indonesian]: "Indonesian",
					[Locale.EnglishUS]: "English",
					[Locale.EnglishGB]: "English",
					[Locale.Bulgarian]: "български",
					[Locale.ChineseCN]: "中文",
					[Locale.ChineseTW]: "繁體中文",
					[Locale.Croatian]: "Hrvatski",
					[Locale.Czech]: "Čeština",
					[Locale.Danish]: "Dansk",
					[Locale.Dutch]: "Nederlands",
					[Locale.Finnish]: "Suomi",
					[Locale.French]: "Français",
					[Locale.German]: "Deutsch",
					[Locale.Greek]: "Ελληνικά",
					[Locale.Hindi]: "हिंदी",
					[Locale.Hungarian]: "Magyar",
					[Locale.Italian]: "Italiano",
					[Locale.Japanese]: "日本語",
					[Locale.Korean]: "한국어",
					[Locale.Lithuanian]: "Lietuviškai",
					[Locale.Norwegian]: "Norsk",
					[Locale.Polish]: "Polski",
					[Locale.PortugueseBR]: "Português do Brasil",
					[Locale.Romanian]: "Română",
					[Locale.Russian]: "Русский",
					[Locale.SpanishES]: "Español",
					[Locale.Swedish]: "Svenska",
					[Locale.Thai]: "ไทย",
					[Locale.Turkish]: "Türkçe",
					[Locale.Ukrainian]: "Українська",
					[Locale.Vietnamese]: "Tiếng Việt",
				}[newGuild.preferredLocale]
			}`,
			"server",
		);

	if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled)
		await log(
			`${LoggingEmojis.SettingChange} Boost progress bar ${
				newGuild.premiumProgressBarEnabled ? "shown" : "hidden"
			}`,
			"server",
		);

	if (oldGuild.splash !== newGuild.splash) {
		const url = newGuild.splashURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingChange} Server invite background ${
				url ? "changed" : "removed"
			}`,
			"server",
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.systemChannel?.id !== newGuild.systemChannel?.id) {
		await log(
			`${LoggingEmojis.SettingChange} System messages channel ${
				newGuild.systemChannel ? `set to ${newGuild.systemChannel.toString()}` : "unset"
			}`,
			"server",
		);
	}
	const noSetup = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressGuildReminderNotifications,
	);
	if (
		oldGuild.systemChannelFlags.has(
			GuildSystemChannelFlags.SuppressGuildReminderNotifications,
		) !== noSetup
	)
		await log(
			`${LoggingEmojis.SettingChange} “Send helpful tips for server setup” ${
				noSetup ? "disabled" : "enabled"
			}`,
			"server",
		);
	const noJoinReplies = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressJoinNotificationReplies,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotificationReplies) !==
		noJoinReplies
	)
		await log(
			`${
				LoggingEmojis.SettingChange
			} “Prompt members to reply to welcome messages with a sticker.” ${
				noJoinReplies ? "enabled" : "disabled"
			}`,
			"server",
		);
	const noJoins = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressJoinNotifications,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications) !==
		noJoins
	)
		await log(
			`${
				LoggingEmojis.SettingChange
			} “Send a random welcome message when someone joins this server.” ${
				noJoins ? "enabled" : "disabled"
			}`,
			"server",
		);
	const noBoosts = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressPremiumSubscriptions,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressPremiumSubscriptions) !==
		noBoosts
	)
		await log(
			`${LoggingEmojis.SettingChange} “Send a message when someone boosts this server.” ${
				noBoosts ? "enabled" : "disabled"
			}`,
			"server",
		);
	const noSubscriptionReplies = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotificationReplies,
	);
	if (
		oldGuild.systemChannelFlags.has(
			GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotificationReplies,
		) !== noSubscriptionReplies
	)
		await log(
			`${
				LoggingEmojis.SettingChange
			} “Prompt members to reply to Server Subscription congratulation messages with a sticker” ${
				noSubscriptionReplies ? "enabled" : "disabled"
			}`,
			"server",
		);
	const noSubscriptions = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotifications,
	);
	if (
		oldGuild.systemChannelFlags.has(
			GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotifications,
		) !== noSubscriptions
	)
		await log(
			`${
				LoggingEmojis.SettingChange
			} “Send a message when someone purchases or renews a Server Subscripton” ${
				noSubscriptions ? "enabled" : "disabled"
			}`,
			"server",
		);
	if (oldGuild.vanityURLCode !== newGuild.vanityURLCode)
		await log(
			`${LoggingEmojis.SettingChange} Custom invite link set to ${newGuild.vanityURLCode}`,
			"server",
		);

	if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
		await log(
			`${LoggingEmojis.SettingChange} Verification level set to “${
				{
					[GuildVerificationLevel.None]: "Unrestricted",
					[GuildVerificationLevel.Low]: "Low",
					[GuildVerificationLevel.Medium]: "Medium",
					[GuildVerificationLevel.High]: "High",
					[GuildVerificationLevel.VeryHigh]: "Highest",
				}[newGuild.verificationLevel]
			}”`,
			"server",
		);
	}
	if (oldGuild.verified !== newGuild.verified)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${newGuild.verified ? "" : "un"}verified`,
			"server",
		);
});

defineEvent("inviteDelete", async (invite) => {
	if (invite.guild?.id !== config.guild.id) return;
	await log(
		`${LoggingEmojis.Invite} Invite ${invite.code} deleted${
			invite.uses === null ? "" : ` with ${invite.uses} uses`
		}`,
		"server",
	);
});

defineEvent("messageDelete", async (message) => {
	if (!shouldLog(message.channel)) return;

	const shush =
		message.partial ||
		(config.channels.modlogs?.id === getBaseChannel(message.channel)?.id &&
			databaseThread.id !== message.channel.id);

	const content = !shush && (await messageToText(message));
	const { embeds, files } = shush
		? { embeds: [], files: [] }
		: extractMessageExtremities(message);

	await log(
		`${LoggingEmojis.MessageDelete} ${message.partial ? "Unknown message" : "Message"}${
			message.author ? ` by ${message.author.toString()}` : ""
		} in ${message.channel.toString()} deleted (ID: ${message.id})`,
		"messages",
		{
			embeds,
			button: { label: "View Context", url: message.url },

			files: content
				? [{ content, extension: "md" }, ...files.map((file) => file.url)]
				: files.map((file) => file.url),
		},
	);
});

defineEvent("messageDeleteBulk", async (messages, channel) => {
	if (!shouldLog(channel)) return;
	const messagesInfo = (
		await Promise.all(
			messages.reverse().map(async (message) => {
				const content = !message.partial && (await messageToText(message));

				return `${message.author?.tag ?? "[unknown]"}${
					message.embeds.length > 0 || message.attachments.size > 0 ? " (" : ""
				}${message.embeds.length > 0 ? `${message.embeds.length} embeds` : ""}${
					message.embeds.length > 0 && message.attachments.size > 0 ? ", " : ""
				}${message.attachments.size > 0 ? `${message.attachments.size} attachments` : ""}${
					message.embeds.length > 0 || message.attachments.size > 0 ? ")" : ""
				}${content ? `:\n${content}` : ""}`;
			}),
		)
	).join("\n\n---\n\n");

	await log(
		`${LoggingEmojis.MessageDelete} ${
			messages.size
		} messages in ${channel.toString()} bulk deleted`,
		"messages",
		{
			files: [{ content: messagesInfo, extension: "txt" }],
			button: { label: "View Context", url: messages.first()?.url ?? "" },
		},
	);
});

defineEvent("messageReactionRemoveAll", async (partialMessage, reactions) => {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	if (!shouldLog(message.channel)) return;

	await log(
		`${
			LoggingEmojis.Emoji
		} Reactions purged on message by ${message.author.toString()} in ${message.channel.toString()} (ID: ${
			message.id
		})`,
		"messages",
		{
			embeds: [
				{
					fields: reactions.map((reaction) => ({
						name: reaction.emoji.toString(),
						value: `${reaction.count} reaction${reaction.count === 1 ? "" : "s"}`,
						inline: true,
					})),
					color: Colors.Blurple,
				},
			],

			button: {
				label: "View Context",
				url: message.url,
			},
		},
	);
});

defineEvent("messageUpdate", async (oldMessage, partialMessage) => {
	const newMessage = partialMessage.partial ? await partialMessage.fetch() : partialMessage;
	if (!shouldLog(newMessage.channel)) return;

	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.flags.has("Crossposted") ? "" : "un"
			}published`,
			"messages",
			{ button: { label: "View Message", url: newMessage.url } },
		);
	}
	if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
		await log(
			`${LoggingEmojis.MessageUpdate} Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed from" : "shown on"
			} message by ${newMessage.author.toString()} in ${newMessage.channel.toString()}`,
			"messages",
			{ button: { label: "View Message", url: newMessage.url }, embeds: oldMessage.embeds },
		);
	}

	if (!oldMessage.partial && oldMessage.pinned !== newMessage.pinned) {
		await log(
			`${
				LoggingEmojis.MessageUpdate
			} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.pinned ? "" : "un"
			}pinned`,
			"messages",
			{ button: { label: "View Message", url: newMessage.url } },
		);
	}

	if (!oldMessage.partial && !newMessage.author.bot) {
		const files = [];
		const contentDiff = unifiedDiff(
			oldMessage.content.split("\n"),
			newMessage.content.split("\n"),
			{ lineterm: "" },
		)
			.join("\n")
			.replace(/^--- \n\+\+\+ \n/, "");
		if (contentDiff) files.push({ content: contentDiff, extension: "diff" });

		const extraDiff = diffString(
			{ ...getMessageJSON(oldMessage), content: undefined, embeds: undefined },
			{ ...getMessageJSON(newMessage), content: undefined, embeds: undefined },
			{ color: false },
		);
		if (extraDiff) {
			const updatedFiles = newMessage.attachments.map((attachment) => attachment.url);
			files.push(
				{ content: extraDiff, extension: "diff" },
				...oldMessage.attachments
					.map((attachment) => attachment.url)
					.filter((attachment) => !updatedFiles.includes(attachment)),
			);
		}

		if (files.length > 0) {
			await log(
				`${
					LoggingEmojis.MessageEdit
				} Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited (ID: ${
					newMessage.id
				})`,
				"messages",
				{ button: { label: "View Message", url: newMessage.url }, files },
			);
		}
	}
});

defineEvent("roleCreate", async (role) => {
	if (role.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Role} ${role.toString()} created`, "server");
});

defineEvent("roleDelete", async (role) => {
	if (role.guild.id !== config.guild.id) return;
	await log(`${LoggingEmojis.Role} @${role.name} deleted (ID: ${role.id})`, "server");
});

defineEvent("voiceStateUpdate", async (oldState, newState) => {
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
});
