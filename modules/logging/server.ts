import {
	GuildDefaultMessageNotifications,
	type Guild,
	GuildExplicitContentFilter,
	GuildMFALevel,
	GuildNSFWLevel,
	GuildSystemChannelFlags,
	GuildVerificationLevel,
	Locale,
	AuditLogEvent,
	GuildAuditLogsEntry,
	time,
	TimestampStyles,
	Invite,
} from "discord.js";
import config from "../../common/config.js";
import log, { LoggingEmojis } from "./misc.js";
import { unifiedDiff } from "difflib";

const createdInvites = new Set<string>();
export async function inviteCreate(entry: GuildAuditLogsEntry<AuditLogEvent.InviteCreate>) {
	if (createdInvites.has(entry.target.code)) return;
	createdInvites.add(entry.target.code);

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
}

export async function guildUpdate(oldGuild: Guild, newGuild: Guild) {
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
						oldGuild.description?.split("\n") ?? [],
						newGuild.description?.split("\n") ?? [],
						{ lineterm: "" },
					)
						.join("\n")
						.replace(/^-{3} \n\+{3} \n/, ""),
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
	if (oldGuild.features.includes("COMMUNITY") === community) {
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
	} else {
		await log(
			`${LoggingEmojis.SettingChange} Community ${community ? "enabled" : "disabled"}`,
			"server",
		);
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

	if (oldGuild.safetyAlertsChannel?.id !== newGuild.safetyAlertsChannel?.id) {
		await log(
			`${LoggingEmojis.SettingChange} Safety notifications channel ${
				newGuild.safetyAlertsChannel
					? `set to ${newGuild.safetyAlertsChannel.toString()}`
					: "unset"
			}`,
			"server",
		);
	}
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
				noJoinReplies ? "disabled" : "enabled"
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
				noJoins ? "disabled" : "enabled"
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
				noBoosts ? "disabled" : "enabled"
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
				noSubscriptionReplies ? "disabled" : "enabled"
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
				noSubscriptions ? "disabled" : "enabled"
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
}
export async function inviteDelete(invite: Invite) {
	if (invite.guild?.id !== config.guild.id) return;
	await log(
		`${LoggingEmojis.Invite} Invite ${invite.code} deleted${
			invite.uses === null ? "" : ` with ${invite.uses} uses`
		}`,
		"server",
	);
}
