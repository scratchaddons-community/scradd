import {
	AuditLogEvent,
	AutoModerationRuleTriggerType,
	WebhookType,
	userMention,
	type Awaitable,
} from "discord.js";
import { defineEvent } from "strife.js";
import config from "../../common/config.js";
import {
	channelCreate,
	channelDelete,
	channelOverwriteCreate,
	channelOverwriteDelete,
	channelOverwriteUpdate,
	channelUpdate,
} from "./channels.js";
import {
	emojiCreate,
	emojiDelete,
	emojiUpdate,
	stickerCreate,
	stickerDelete,
	stickerUpdate,
} from "./expressions.js";
import {
	messageDelete,
	messageDeleteBulk,
	messageReactionRemoveAll,
	messageUpdate,
} from "./messages.js";
import log from "./misc.js";
import { LogSeverity, LoggingEmojis, extraAuditLogsInfo, type AuditLog } from "./util.js";
import { memberRoleUpdate, roleCreate, roleDelete, roleUpdate } from "./roles.js";
import { guildUpdate, inviteCreate, inviteDelete } from "./guild.js";
import { threadCreate, threadDelete, threadUpdate } from "./threads.js";
import {
	guildMemberAdd,
	guildMemberRemove,
	guildMemberUpdate,
	memberBanAdd,
	memberBanRemove,
	memberKick,
	memberPrune,
	userUpdate,
} from "./users.js";
import {
	guildScheduledEventCreate,
	guildScheduledEventDelete,
	guildScheduledEventUpdate,
	voiceStateUpdate,
} from "./voice.js";

const events: { [Event in AuditLogEvent]?: (entry: AuditLog<Event>) => Awaitable<void> } = {
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
	async [AuditLogEvent.BotAdd](entry) {
		await log(
			`${LoggingEmojis.Integration} ${
				entry.target?.toString() ?? "Bot"
			} added${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	},
	[AuditLogEvent.RoleCreate]: roleCreate,
	[AuditLogEvent.RoleUpdate]: roleUpdate,
	[AuditLogEvent.InviteCreate]: inviteCreate,
	async [AuditLogEvent.WebhookCreate](entry) {
		if (entry.target.type !== WebhookType.Incoming) return;
		await log(
			`${LoggingEmojis.Integration} Webhook ${entry.target.name} (ID: ${
				entry.target.id
			}) created${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	},
	async [AuditLogEvent.WebhookDelete](entry) {
		await log(
			`${LoggingEmojis.Integration} Webhook ${entry.target.name} deleted${extraAuditLogsInfo(
				entry,
			)}`,
			LogSeverity.ImportantUpdate,
		);
	},
	[AuditLogEvent.EmojiCreate]: emojiCreate,
	[AuditLogEvent.EmojiUpdate]: emojiUpdate,
	[AuditLogEvent.EmojiDelete]: emojiDelete,
	async [AuditLogEvent.IntegrationCreate](entry) {
		await log(
			`${LoggingEmojis.Integration} ${entry.target.name} (ID: ${
				entry.target.id
			}) added${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	},
	async [AuditLogEvent.IntegrationDelete](entry) {
		await log(
			`${LoggingEmojis.Integration} ${entry.target.name} (ID: ${
				entry.target.id
			}) removed${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	},
	[AuditLogEvent.StickerCreate]: stickerCreate,
	[AuditLogEvent.StickerUpdate]: stickerUpdate,
	[AuditLogEvent.StickerDelete]: stickerDelete,
	[AuditLogEvent.GuildScheduledEventCreate]: guildScheduledEventCreate,
	[AuditLogEvent.GuildScheduledEventUpdate]: guildScheduledEventUpdate,
	[AuditLogEvent.ThreadCreate]: threadCreate,
	[AuditLogEvent.ThreadDelete]: threadDelete,
	async [AuditLogEvent.ApplicationCommandPermissionUpdate](entry) {
		await log(
			`${LoggingEmojis.Integration} Permissions for ${userMention(
				entry.extra.applicationId,
			)}’s commands changed${extraAuditLogsInfo(entry)}`,
			LogSeverity.ServerChange,
		);
	},
	async [AuditLogEvent.AutoModerationRuleCreate](entry) {
		await log(
			`${LoggingEmojis.Integration} ${
				{
					[AutoModerationRuleTriggerType.Keyword]: "Block Custom Words",
					[AutoModerationRuleTriggerType.Spam]: "Block Suspected Spam Content",
					[AutoModerationRuleTriggerType.KeywordPreset]: "Block Commonly Flagged Words",
					[AutoModerationRuleTriggerType.MentionSpam]: "Block Mention Spam",
				}[entry.target.triggerType]
			} AutoMod Rule ${entry.target.name} (ID: ${
				entry.target.id
			}) created${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	},
	async [AuditLogEvent.AutoModerationRuleDelete](entry) {
		await log(
			`${LoggingEmojis.Integration} AutoMod Rule ${entry.target.name} (ID: ${
				entry.target.id
			}) deleted${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	},
};
defineEvent("guildAuditLogEntryCreate", async (entry, guild) => {
	// @ts-expect-error T2345 -- No concrete fix to this
	if (guild.id === config.guild.id) await events[entry.action]?.(entry);
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
