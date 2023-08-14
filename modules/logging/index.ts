import {
	AuditLogEvent,
	AutoModerationRuleTriggerType,
	GuildAuditLogsEntry,
	WebhookType,
	userMention,
} from "discord.js";
import config from "../../common/config.js";
import { defineEvent } from "strife.js";
import {
	channelCreate,
	channelDelete,
	channelOverwriteCreate,
	channelOverwriteUpdate,
	channelOverwriteDelete,
	channelUpdate,
} from "./channel.js";
import {
	memberKick,
	memberPrune,
	memberBanAdd,
	memberBanRemove,
	guildMemberRemove,
	guildMemberAdd,
	guildMemberUpdate,
	userUpdate,
} from "./user.js";
import {
	messageDelete,
	messageDeleteBulk,
	messageReactionRemoveAll,
	messageUpdate,
} from "./message.js";
import {
	guildScheduledEventCreate,
	guildScheduledEventDelete,
	guildScheduledEventUpdate,
	voiceStateUpdate,
} from "./voice.js";
import { guildUpdate, inviteCreate, inviteDelete } from "./server.js";
import log, { LoggingEmojis, extraAuditLogsInfo } from "./misc.js";
import {
	emojiCreate,
	emojiUpdate,
	emojiDelete,
	stickerCreate,
	stickerUpdate,
	stickerDelete,
} from "./expressions.js";
import { memberRoleUpdate, roleCreate, roleUpdate, roleDelete } from "./role.js";
import { threadCreate, threadDelete, threadUpdate } from "./thread.js";

const events: {
	[event in AuditLogEvent]?: (entry: GuildAuditLogsEntry<event>) => void | Promise<void>;
} = {
	[AuditLogEvent.ChannelCreate]: channelCreate,
	[AuditLogEvent.ChannelDelete]: channelDelete,
	[AuditLogEvent.ChannelOverwriteCreate]: channelOverwriteCreate,
	[AuditLogEvent.ChannelOverwriteUpdate]: channelOverwriteUpdate,
	[AuditLogEvent.ChannelOverwriteDelete]: channelOverwriteDelete,
	[AuditLogEvent.MemberKick]: memberKick,
	[AuditLogEvent.MemberPrune]: memberPrune,
	[AuditLogEvent.MemberBanAdd]: memberBanAdd,
	[AuditLogEvent.MemberBanRemove]: memberBanRemove,
	[AuditLogEvent.MemberRoleUpdate]: memberRoleUpdate,
	async [AuditLogEvent.BotAdd](entry: GuildAuditLogsEntry<AuditLogEvent.BotAdd>) {
		if (!entry.target) return;
		await log(
			`${LoggingEmojis.Integration} ${entry.target.toString()} added${extraAuditLogsInfo(
				entry,
			)}`,
			"server",
		);
	},
	[AuditLogEvent.RoleCreate]: roleCreate,
	[AuditLogEvent.RoleUpdate]: roleUpdate,
	[AuditLogEvent.InviteCreate]: inviteCreate,
	async [AuditLogEvent.WebhookCreate](entry: GuildAuditLogsEntry<AuditLogEvent.WebhookCreate>) {
		if (entry.target.type !== WebhookType.Incoming) return;
		await log(
			`${LoggingEmojis.Integration} Webhook ${entry.target.name} (ID: ${
				entry.target.id
			}) created${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	// async [AuditLogEvent.WebhookUpdate](entry) {},
	async [AuditLogEvent.WebhookDelete](entry: GuildAuditLogsEntry<AuditLogEvent.WebhookDelete>) {
		await log(
			`${LoggingEmojis.Integration} Webhook ${entry.target.name} deleted${extraAuditLogsInfo(
				entry,
			)}`,
			"server",
		);
	},
	[AuditLogEvent.EmojiCreate]: emojiCreate,
	[AuditLogEvent.EmojiUpdate]: emojiUpdate,
	[AuditLogEvent.EmojiDelete]: emojiDelete,
	async [AuditLogEvent.IntegrationCreate](
		entry: GuildAuditLogsEntry<AuditLogEvent.IntegrationCreate>,
	) {
		await log(
			`${LoggingEmojis.Integration} ${entry.target.name} (ID: ${
				entry.target.id
			}) added${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	async [AuditLogEvent.IntegrationDelete](
		entry: GuildAuditLogsEntry<AuditLogEvent.IntegrationDelete>,
	) {
		await log(
			`${LoggingEmojis.Integration} ${entry.target.name} (ID: ${
				entry.target.id
			}) removed${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	[AuditLogEvent.StickerCreate]: stickerCreate,
	[AuditLogEvent.StickerUpdate]: stickerUpdate,
	[AuditLogEvent.StickerDelete]: stickerDelete,
	[AuditLogEvent.GuildScheduledEventCreate]: guildScheduledEventCreate,
	[AuditLogEvent.GuildScheduledEventUpdate]: guildScheduledEventUpdate,
	[AuditLogEvent.ThreadCreate]: threadCreate,
	[AuditLogEvent.ThreadDelete]: threadDelete,
	async [AuditLogEvent.ApplicationCommandPermissionUpdate](
		entry: GuildAuditLogsEntry<AuditLogEvent.ApplicationCommandPermissionUpdate>,
	) {
		await log(
			`${LoggingEmojis.Integration} Permissions for ${userMention(
				entry.extra.applicationId,
			)}’s commands updated${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
	async [AuditLogEvent.AutoModerationRuleCreate](
		entry: GuildAuditLogsEntry<AuditLogEvent.AutoModerationRuleCreate>,
	) {
		await log(
			`${LoggingEmojis.Integration} AutoMod "${
				{
					[AutoModerationRuleTriggerType.Keyword]: "Block Custom Words",
					[AutoModerationRuleTriggerType.Spam]: "Block Suspected Spam Content",
					[AutoModerationRuleTriggerType.KeywordPreset]: "Block Commonly Flagged Words",
					[AutoModerationRuleTriggerType.MentionSpam]: "Block Mention Spam",
				}[entry.target.triggerType]
			}" Rule ${entry.target.name} (ID: ${entry.target.id}) created${extraAuditLogsInfo(
				entry,
			)}`,
			"server",
		);
	},
	async [AuditLogEvent.AutoModerationRuleDelete](
		entry: GuildAuditLogsEntry<AuditLogEvent.AutoModerationRuleDelete>,
	) {
		await log(
			`${LoggingEmojis.Integration} AutoMod Rule ${entry.target.name} (ID: ${
				entry.target.id
			}) deleted${extraAuditLogsInfo(entry)}`,
			"server",
		);
	},
};
defineEvent("guildAuditLogEntryCreate", async (entry, guild) => {
	// @ts-expect-error T2345 -- No concrete fix to this
	if (guild.id === config.guild.id) events[entry.action]?.(entry);
});

defineEvent("channelUpdate", channelUpdate);
defineEvent("guildMemberAdd", guildMemberAdd);
defineEvent("guildMemberRemove", guildMemberRemove);
defineEvent("guildMemberUpdate", guildMemberUpdate);
defineEvent("guildScheduledEventDelete", guildScheduledEventDelete);
defineEvent("guildUpdate", guildUpdate);
defineEvent("inviteDelete", inviteDelete);
defineEvent("messageDelete", messageDelete);
defineEvent("messageDeleteBulk", messageDeleteBulk);
defineEvent("messageReactionRemoveAll", messageReactionRemoveAll);
defineEvent("messageUpdate", messageUpdate);
defineEvent("roleDelete", roleDelete);
defineEvent("threadUpdate", threadUpdate);
defineEvent("userUpdate", userUpdate);
defineEvent("voiceStateUpdate", voiceStateUpdate);
