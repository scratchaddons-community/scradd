import { unifiedDiff } from "difflib";
import {
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	GuildMFALevel,
	GuildNSFWLevel,
	GuildSystemChannelFlags,
	GuildVerificationLevel,
	Locale,
	TimestampStyles,
	time,
	userMention,
	type AuditLogEvent,
	type Guild,
	type Invite,
} from "discord.js";
import config from "../../common/config.js";
import log, { LogSeverity, LoggingEmojis, extraAuditLogsInfo, type AuditLog } from "./misc.js";

const createdInvites = new Set<string>();
export async function inviteCreate(entry: AuditLog<AuditLogEvent.InviteCreate>): Promise<void> {
	if (createdInvites.has(entry.target.code)) return;
	createdInvites.add(entry.target.code);

	await log(
		`${LoggingEmojis.Invite} ${entry.target.temporary ? "Temporary invite" : "Invite"} ${
			entry.target.code
		}${entry.target.channel ? ` for ${entry.target.channel.toString()}` : ""} created${
			entry.executor ? ` by ${entry.executor.toString()}` : ""
		}${
			entry.target.expiresAt || entry.target.maxUses ?
				`, expiring ${
					entry.target.expiresAt ?
						time(entry.target.expiresAt, TimestampStyles.LongDate)
					:	""
				}${entry.target.expiresAt && entry.target.maxUses ? " or " : ""}${
					entry.target.maxUses ?
						`after ${entry.target.maxUses} use${entry.target.maxUses === 1 ? "" : "s"}`
					:	""
				}`
			:	""
		}${extraAuditLogsInfo({ reason: entry.reason })}`,
		LogSeverity.Resource,
	);
}

export async function guildUpdate(oldGuild: Guild, newGuild: Guild): Promise<void> {
	if (newGuild.id !== config.guild.id) return;

	if (oldGuild.afkChannel?.id !== newGuild.afkChannel?.id) {
		await log(
			`${LoggingEmojis.SettingChange} Inactive channel set to ${
				newGuild.afkChannel?.toString() ?? "No inactive channel"
			}`,
			LogSeverity.ServerChange,
		);
	}
	if (oldGuild.afkTimeout !== newGuild.afkTimeout)
		await log(
			`${LoggingEmojis.SettingChange} Inactive timeout set to ${newGuild.afkTimeout} seconds`,
			LogSeverity.ServerChange,
		);

	if (oldGuild.banner !== newGuild.banner) {
		const url = newGuild.bannerURL({ size: 512 });
		await log(
			`${LoggingEmojis.SettingChange} Server banner background was ${
				url ? "changed" : "removed"
			}`,
			LogSeverity.ServerChange,
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
		await log(
			`${LoggingEmojis.SettingChange} Default notification settings set to ${
				{
					[GuildDefaultMessageNotifications.AllMessages]: "All messages",
					[GuildDefaultMessageNotifications.OnlyMentions]: "Only @mentions",
				}[newGuild.defaultMessageNotifications]
			}`,
			LogSeverity.ServerChange,
		);
	}
	if (oldGuild.description !== newGuild.description) {
		await log(
			`${LoggingEmojis.SettingChange} Server description changed`,
			LogSeverity.ServerChange,
			{
				files: [
					{
						content: unifiedDiff(
							oldGuild.description?.split("\n") ?? [],
							newGuild.description?.split("\n") ?? [],
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
	if (oldGuild.discoverySplash !== newGuild.discoverySplash) {
		const url = newGuild.discoverySplashURL({ size: 512 });
		await log(
			`${LoggingEmojis.SettingChange} Server discovery listing cover image ${
				url ? "changed" : "removed"
			}`,
			LogSeverity.ServerChange,
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
		await log(
			`${LoggingEmojis.SettingChange} Explicit image filter set to ${
				{
					[GuildExplicitContentFilter.Disabled]: "Do not filter",
					[GuildExplicitContentFilter.MembersWithoutRoles]:
						"Filter messages from server members without roles",
					[GuildExplicitContentFilter.AllMembers]: "Filter messages from all members",
				}[newGuild.explicitContentFilter]
			}`,
			LogSeverity.ServerChange,
		);
	}
	const community = newGuild.features.includes("COMMUNITY");
	if (oldGuild.features.includes("COMMUNITY") === community) {
		if (oldGuild.publicUpdatesChannel?.id !== newGuild.publicUpdatesChannel?.id) {
			await log(
				`${LoggingEmojis.SettingChange} Community updates channel ${
					newGuild.publicUpdatesChannel ?
						`set to ${newGuild.publicUpdatesChannel.toString()}`
					:	"unset"
				}`,
				LogSeverity.ServerChange,
			);
		}
		if (oldGuild.rulesChannel?.id !== newGuild.rulesChannel?.id) {
			await log(
				`${LoggingEmojis.SettingChange} Rules or guidelines channel ${
					newGuild.rulesChannel ? `set to ${newGuild.rulesChannel.toString()}` : "unset"
				}`,
				LogSeverity.ServerChange,
			);
		}
	} else {
		await log(
			`${LoggingEmojis.SettingChange} Community ${community ? "enabled" : "disabled"}`,
			LogSeverity.ImportantUpdate,
		);
	}
	const monetized = newGuild.features.includes("CREATOR_MONETIZABLE_PROVISIONAL");
	if (oldGuild.features.includes("CREATOR_MONETIZABLE_PROVISIONAL") !== monetized)
		await log(
			`${LoggingEmojis.SettingChange} Monetization ${monetized ? "enabled" : "disabled"}`,
			LogSeverity.ImportantUpdate,
		);
	const storePage = newGuild.features.includes("CREATOR_STORE_PAGE");
	if (oldGuild.features.includes("CREATOR_STORE_PAGE") !== storePage)
		await log(
			`${LoggingEmojis.SettingChange} Server Subscription Promo Page ${
				storePage ? "enabled" : "disabled"
			}`,
			LogSeverity.ImportantUpdate,
		);
	const developerSupport = newGuild.features.includes("DEVELOPER_SUPPORT_SERVER");
	if (oldGuild.features.includes("DEVELOPER_SUPPORT_SERVER") !== developerSupport)
		await log(
			`${LoggingEmojis.SettingChange} Server ${
				developerSupport ? "" : "un"
			}marked as a Developer Support Server`,
			LogSeverity.ImportantUpdate,
		);
	const discoverable = newGuild.features.includes("DISCOVERABLE");
	if (oldGuild.features.includes("DISCOVERABLE") !== discoverable)
		await log(
			`${LoggingEmojis.SettingChange} Discovery ${discoverable ? "enabled" : "disabled"}`,
			LogSeverity.ImportantUpdate,
		);
	const featured = newGuild.features.includes("FEATURABLE");
	if (oldGuild.features.includes("FEATURABLE") !== featured)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${
				featured ? "" : "un"
			}featured in Server Discovery`,
			LogSeverity.ImportantUpdate,
		);
	const directory = newGuild.features.includes("HAS_DIRECTORY_ENTRY");
	if (oldGuild.features.includes("HAS_DIRECTORY_ENTRY") !== directory)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${
				directory ? "added" : "removed"
			} to a directory channel`,
			LogSeverity.ImportantUpdate,
		);
	const invitesDisabled = newGuild.features.includes("INVITES_DISABLED");
	if (oldGuild.features.includes("INVITES_DISABLED") !== invitesDisabled)
		await log(
			`${LoggingEmojis.Invite} Invites ${invitesDisabled ? "" : "un"}paused`,
			LogSeverity.ImportantUpdate,
		);
	const hub = newGuild.features.includes("LINKED_TO_HUB");
	if (oldGuild.features.includes("LINKED_TO_HUB") !== hub)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${hub ? "added" : "removed"} from a Student Hub`,
			LogSeverity.ImportantUpdate,
		);
	const screening = newGuild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED");
	if (oldGuild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED") !== screening)
		await log(
			`${LoggingEmojis.SettingChange} Server set to${
				screening ? "" : " not"
			} require members must accept rules before they can talk or DM`,
			LogSeverity.ServerChange,
		);
	const subscriptions = newGuild.features.includes("ROLE_SUBSCRIPTIONS_ENABLED");
	if (oldGuild.features.includes("ROLE_SUBSCRIPTIONS_ENABLED") !== subscriptions)
		await log(
			`${LoggingEmojis.SettingChange} Role Subscriptions ${
				subscriptions ? "enabled" : "disabled"
			}`,
			LogSeverity.ImportantUpdate,
		);
	const ticketedEvents = newGuild.features.includes("TICKETED_EVENTS_ENABLED");
	if (oldGuild.features.includes("TICKETED_EVENTS_ENABLED") !== ticketedEvents)
		await log(
			`${LoggingEmojis.SettingChange} Ticketed events ${
				ticketedEvents ? "enabled" : "disabled"
			}`,
			LogSeverity.ImportantUpdate,
		);
	const welcomeScreen = newGuild.features.includes("WELCOME_SCREEN_ENABLED");
	if (oldGuild.features.includes("WELCOME_SCREEN_ENABLED") !== welcomeScreen)
		await log(
			`${LoggingEmojis.SettingChange} Welcome Screen ${
				welcomeScreen ? "enabled" : "disabled"
			}`,
			LogSeverity.ImportantUpdate,
		);

	if (oldGuild.icon !== newGuild.icon) {
		const url = newGuild.iconURL({ size: 512 });
		await log(
			`${LoggingEmojis.SettingChange} Server icon ${url ? "changed" : "removed"}`,
			LogSeverity.ImportantUpdate,
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.maximumMembers !== newGuild.maximumMembers) {
		await log(
			`${LoggingEmojis.ServerUpdate} Maximum members ${
				typeof newGuild.maximumMembers === "number" ?
					`set to ${newGuild.maximumMembers}`
				:	"reset"
			}`,
			LogSeverity.ServerChange,
		);
	}
	if (oldGuild.maxVideoChannelUsers !== newGuild.maxVideoChannelUsers) {
		await log(
			`${LoggingEmojis.ServerUpdate} Maximum members in a video channel ${
				typeof newGuild.maxVideoChannelUsers === "number" ?
					`set to ${newGuild.maxVideoChannelUsers}`
				:	"reset"
			}`,
			LogSeverity.ServerChange,
		);
	}
	if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
		await log(
			`${LoggingEmojis.SettingChange} Server set to${
				newGuild.mfaLevel === GuildMFALevel.None ? " not" : ""
			} require 2FA for moderator actions`,
			LogSeverity.ImportantUpdate,
		);
	}
	if (oldGuild.name !== newGuild.name)
		await log(
			`${LoggingEmojis.SettingChange} Server renamed to ${newGuild.name}`,
			LogSeverity.ImportantUpdate,
		);

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
			LogSeverity.ImportantUpdate,
		);
	}
	if (oldGuild.ownerId !== newGuild.ownerId)
		await log(
			`${LoggingEmojis.SettingChange} Ownership transferred to ${userMention(
				newGuild.ownerId,
			)}`,
			LogSeverity.ImportantUpdate,
		);

	if (oldGuild.partnered !== newGuild.partnered)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${newGuild.partnered ? "" : "un"}partnered`,
			LogSeverity.ImportantUpdate,
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
					[Locale.SpanishLATAM]: "Español, LATAM",
					[Locale.Swedish]: "Svenska",
					[Locale.Thai]: "ไทย",
					[Locale.Turkish]: "Türkçe",
					[Locale.Ukrainian]: "Українська",
					[Locale.Vietnamese]: "Tiếng Việt",
				}[newGuild.preferredLocale]
			}`,
			LogSeverity.ImportantUpdate,
		);

	if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled)
		await log(
			`${LoggingEmojis.SettingChange} Boost progress bar ${
				newGuild.premiumProgressBarEnabled ? "shown" : "hidden"
			}`,
			LogSeverity.ServerChange,
		);

	if (oldGuild.safetyAlertsChannel?.id !== newGuild.safetyAlertsChannel?.id) {
		await log(
			`${LoggingEmojis.SettingChange} Safety notifications channel ${
				newGuild.safetyAlertsChannel ?
					`set to ${newGuild.safetyAlertsChannel.toString()}`
				:	"unset"
			}`,
			LogSeverity.ServerChange,
		);
	}
	if (oldGuild.splash !== newGuild.splash) {
		const url = newGuild.splashURL({ size: 512 });
		await log(
			`${LoggingEmojis.SettingChange} Server invite background ${
				url ? "changed" : "removed"
			}`,
			LogSeverity.ServerChange,
			{ files: url ? [url] : [] },
		);
	}
	if (oldGuild.systemChannel?.id !== newGuild.systemChannel?.id) {
		await log(
			`${LoggingEmojis.SettingChange} System messages channel ${
				newGuild.systemChannel ? `set to ${newGuild.systemChannel.toString()}` : "unset"
			}`,
			LogSeverity.ServerChange,
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
			`${LoggingEmojis.SettingChange} Server set to${
				noSetup ? " not" : ""
			} send helpful tips for server setup`,
			LogSeverity.ServerChange,
		);
	const noJoinReplies = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressJoinNotificationReplies,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotificationReplies) !==
		noJoinReplies
	)
		await log(
			`${LoggingEmojis.SettingChange} Server set to${
				noJoinReplies ? " not" : ""
			} prompt members to reply to welcome messages with a sticker`,
			LogSeverity.ServerChange,
		);
	const noJoins = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressJoinNotifications,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications) !==
		noJoins
	)
		await log(
			`${LoggingEmojis.SettingChange} Server set to${
				noJoins ? " not" : ""
			} send a random welcome message when someone joins this server`,
			LogSeverity.ServerChange,
		);
	const noBoosts = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressPremiumSubscriptions,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressPremiumSubscriptions) !==
		noBoosts
	)
		await log(
			`${LoggingEmojis.SettingChange} Server set to${
				noJoins ? " not" : ""
			} send a message when someone boosts this server`,
			LogSeverity.ServerChange,
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
			`${LoggingEmojis.SettingChange} Server set to${
				noSubscriptionReplies ? " not" : ""
			} prompt members to reply to Server Subscription congratulation messages with a sticker`,
			LogSeverity.ServerChange,
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
			`${LoggingEmojis.SettingChange} Server set to${
				noSubscriptions ? " not" : ""
			} send a message when someone purchases or renews a Server Subscripton`,
			LogSeverity.ServerChange,
		);
	if (oldGuild.vanityURLCode !== newGuild.vanityURLCode)
		await log(
			`${LoggingEmojis.SettingChange} Custom invite link ${
				newGuild.vanityURLCode ? `set to ${newGuild.vanityURLCode}` : "reset"
			}`,
			LogSeverity.ImportantUpdate,
		);

	if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
		await log(
			`${LoggingEmojis.SettingChange} Verification level set to ${
				{
					[GuildVerificationLevel.None]: "Unrestricted",
					[GuildVerificationLevel.Low]: "Low",
					[GuildVerificationLevel.Medium]: "Medium",
					[GuildVerificationLevel.High]: "High",
					[GuildVerificationLevel.VeryHigh]: "Highest",
				}[newGuild.verificationLevel]
			}`,
			LogSeverity.ImportantUpdate,
		);
	}
	if (oldGuild.verified !== newGuild.verified)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${newGuild.verified ? "" : "un"}verified`,
			LogSeverity.ImportantUpdate,
		);
}
export async function inviteDelete(invite: Invite): Promise<void> {
	if (invite.guild?.id !== config.guild.id) return;
	await log(
		`${LoggingEmojis.Invite} Invite ${invite.code} deleted${
			invite.uses ? ` with ${invite.uses} uses` : ""
		}`,
		LogSeverity.Resource,
	);
}
