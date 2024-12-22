import type { Awaitable } from "discord.js";
import type { AuditLog } from "./util.ts";

import {
	AuditLogEvent,
	AutoModerationRule,
	AutoModerationRuleTriggerType,
	WebhookType,
} from "discord.js";
import { defineEvent } from "strife.js";

import config from "../../common/config.ts";
import { channelCreate, channelDelete, channelUpdate } from "./channels.ts";
import { guildUpdate, inviteCreate, inviteDelete } from "./guild.ts";
import {
	messageDelete,
	messageDeleteBulk,
	messageReactionRemoveAll,
	messageUpdate,
} from "./messages.ts";
import log from "./misc.ts";
import { memberRoleUpdate, roleCreate, roleDelete, roleUpdate } from "./roles.ts";
import { threadCreate, threadDelete, threadUpdate } from "./threads.ts";
import {
	guildMemberAdd,
	guildMemberRemove,
	guildMemberUpdate,
	memberBanAdd,
	memberBanRemove,
	memberKick,
	memberPrune,
	userUpdate,
} from "./users.ts";
import { extraAuditLogsInfo, LoggingEmojis, LogSeverity } from "./util.ts";
import {
	guildScheduledEventCreate,
	guildScheduledEventDelete,
	guildScheduledEventUpdate,
} from "./voice.ts";

const events: { [Event in AuditLogEvent]?: (entry: AuditLog<Event>) => Awaitable<void> } = {
	[AuditLogEvent.ChannelCreate]: channelCreate,
	[AuditLogEvent.ChannelDelete]: channelDelete,
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
	// @ts-expect-error -- https://github.com/discordjs/discord.js/pull/10591
	[AuditLogEvent.RoleCreate]: roleCreate,
	// @ts-expect-error -- https://github.com/discordjs/discord.js/pull/10591
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
	[AuditLogEvent.GuildScheduledEventCreate]: guildScheduledEventCreate,
	[AuditLogEvent.GuildScheduledEventUpdate]: guildScheduledEventUpdate,
	[AuditLogEvent.ThreadCreate]: threadCreate,
	[AuditLogEvent.ThreadDelete]: threadDelete,
	async [AuditLogEvent.AutoModerationRuleCreate](entry) {
		if (!(entry.target instanceof AutoModerationRule)) return;
		await log(
			`${LoggingEmojis.Integration} ${
				{
					[AutoModerationRuleTriggerType.Keyword]: "Block Custom Words",
					[AutoModerationRuleTriggerType.Spam]: "Block Suspected Spam Content",
					[AutoModerationRuleTriggerType.KeywordPreset]: "Block Commonly Flagged Words",
					[AutoModerationRuleTriggerType.MentionSpam]: "Block Mention Spam",
					[AutoModerationRuleTriggerType.MemberProfile]:
						"Block Words in Member Profile Names",
				}[entry.target.triggerType]
			} AutoMod Rule ${entry.target.name} (ID: ${
				entry.target.id
			}) created${extraAuditLogsInfo(entry)}`,
			LogSeverity.ImportantUpdate,
		);
	},
	async [AuditLogEvent.AutoModerationRuleDelete](entry) {
		if (!(entry.target instanceof AutoModerationRule)) return;
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
