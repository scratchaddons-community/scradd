import {
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	GuildMFALevel,
	GuildNSFWLevel,
	time,
	Locale,
	GuildSystemChannelFlags,
	GuildVerificationLevel,
} from "discord.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import defineEvent from "../../events.js";
import log, { LoggingEmojis, shouldLog } from "./misc.js";
import difflib from "difflib";

defineEvent("guildMemberAdd", async (member) => {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`${LoggingEmojis.Members} Member ${member.toString()} joined`, "members");
});

defineEvent("guildMemberRemove", async (member) => {
	if (member.guild.id !== CONSTANTS.guild.id) return;
	await log(`${LoggingEmojis.Members} Member ${member.toString()} left`, "members");
});

defineEvent("guildMemberUpdate", async (oldMember, newMember) => {
	if (newMember.guild.id !== CONSTANTS.guild.id) return;
	if (oldMember.avatar !== newMember.avatar) {
		const avatarURL = newMember.avatarURL({ size: 128 });
		await log(
			`${LoggingEmojis.UserUpdate} Member ${newMember.toString()} ${
				avatarURL ? "changed" : "removed"
			} their server avatar`,
			"members",
			{ files: avatarURL ? [{ url: avatarURL }] : undefined },
		);
	}

	if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil) {
		if (
			newMember.communicationDisabledUntil &&
			Number(newMember.communicationDisabledUntil) > Date.now()
		)
			await log(
				`${LoggingEmojis.UserUpdate} Member ${newMember.toString()} timed out until ${time(
					newMember.communicationDisabledUntil,
				)}`,
				"members",
			);
		else if (
			oldMember.communicationDisabledUntil &&
			Number(oldMember.communicationDisabledUntil) > Date.now()
		)
			await log(
				`${LoggingEmojis.UserUpdate} Member ${newMember.toString()}’s timeout was removed`,
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
			`${LoggingEmojis.UserUpdate} User ${newMember.user.toString()} ${
				automodQuarantine ? "" : "un"
			}quarantined based on AutoMod rules`,
			"members",
		);
	}

	const verified = !!newMember.flags?.has("BypassesVerification");
	if (!!oldMember.flags?.has("BypassesVerification") !== verified) {
		await log(
			`${LoggingEmojis.UserUpdate} User ${newMember.user.toString()} ${
				verified ? "" : "un"
			}verified`,
			"members",
		);
	}

	if (oldMember.nickname !== newMember.nickname)
		await log(
			`${LoggingEmojis.UserUpdate} Member ${newMember.toString()}${
				newMember.nickname
					? ` was nicknamed ${newMember.nickname}`
					: "’s nickname was removed"
			}`,
			"members",
		);

	if (oldMember.user.avatar !== newMember.user.avatar) {
		await log(
			`${LoggingEmojis.UserUpdate} User ${newMember.user.toString()} changed their avatar`,
			"members",
			{
				files: [{ url: newMember.user.displayAvatarURL({ size: 128 }) }],
			},
		);
	}

	const quarantined = !!newMember.user.flags?.has("Quarantined");
	if (!!oldMember.user.flags?.has("Quarantined") !== quarantined) {
		await log(
			`${LoggingEmojis.UserUpdate} User ${newMember.user.toString()} ${
				quarantined ? "" : "un"
			}quarantined`,
			"members",
		);
	}

	const spammer = !!newMember.user.flags?.has("Spammer");
	if (!!oldMember.user.flags?.has("Spammer") !== spammer) {
		await log(
			`${LoggingEmojis.UserUpdate} User ${newMember.user.toString()} ${
				spammer ? "" : "un"
			}marked as likely spammer`,
			"members",
		);
	}

	if (oldMember.user.tag !== newMember.user.tag) {
		await log(
			`${
				LoggingEmojis.UserUpdate
			} User ${newMember.user.toString()} changed their username from ${
				oldMember.user.tag
			} to ${newMember.user.tag}`,
			"members",
		);
	}

	// TODO: this doesn't go here
	if (newMember.roles.premiumSubscriberRole && CONSTANTS.roles.booster)
		await newMember.roles.add(CONSTANTS.roles.booster, "Boosted the server");
});

defineEvent("guildUpdate", async (oldGuild, newGuild) => {
	if (newGuild.id !== CONSTANTS.guild.id) return;

	if (oldGuild.afkChannel?.id !== newGuild.afkChannel?.id) {
		await log(
			`${LoggingEmojis.SettingsChange} Inactive channel set to ${
				newGuild.afkChannel?.toString() ?? "No inactive channel"
			}`,
			"server",
		);
	}
	if (oldGuild.afkTimeout !== newGuild.afkTimeout)
		await log(
			`${LoggingEmojis.SettingsChange} Inactive timeout set to ${newGuild.afkTimeout} seconds`,
			"server",
		);

	if (oldGuild.banner !== newGuild.banner) {
		const url = newGuild.bannerURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingsChange} Server banner background was ${
				url ? "changed" : "removed"
			}`,
			"server",
			{ files: url ? [{ url }] : [] },
		);
	}
	if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
		await log(
			`${LoggingEmojis.SettingsChange} Default notification settings set to “${
				{
					[GuildDefaultMessageNotifications.AllMessages]: "All messages",
					[GuildDefaultMessageNotifications.OnlyMentions]: "Only @mentions",
				}[newGuild.defaultMessageNotifications]
			}”`,
			"server",
		);
	}
	if (oldGuild.description !== newGuild.description) {
		await log(`${LoggingEmojis.SettingsChange} Server description was changed`, "server", {
			files: [
				{
					content: difflib
						.unifiedDiff(
							oldGuild.description?.split("\n") ?? "",
							newGuild.description?.split("\n") ?? "",
						)
						.join("\n"),
					extension: "diff",
				},
			],
		});
	}
	if (oldGuild.discoverySplash !== newGuild.discoverySplash) {
		const url = newGuild.discoverySplashURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingsChange} Server discovery listing cover image ${
				url ? "changed" : "removed"
			}`,
			"server",
			{ files: url ? [{ url }] : [] },
		);
	}
	if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
		await log(
			`${LoggingEmojis.SettingsChange} Explicit image filter set to “${
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
			`${LoggingEmojis.SettingsChange} Community ${community ? "en" : "dis"}abled`,
			"server",
		);
	const monetized = newGuild.features.includes("CREATOR_MONETIZABLE_PROVISIONAL");
	if (oldGuild.features.includes("CREATOR_MONETIZABLE_PROVISIONAL") !== monetized)
		await log(
			`${LoggingEmojis.SettingsChange} Monetization ${monetized ? "en" : "dis"}abled`,
			"server",
		);
	const storePage = newGuild.features.includes("CREATOR_STORE_PAGE");
	if (oldGuild.features.includes("CREATOR_STORE_PAGE") !== storePage)
		await log(
			`${LoggingEmojis.SettingsChange} Server Subscription Promo Page ${
				storePage ? "en" : "dis"
			}abled`,
			"server",
		);
	const developerSupport = newGuild.features.includes("DEVELOPER_SUPPORT_SERVER");
	if (oldGuild.features.includes("DEVELOPER_SUPPORT_SERVER") !== developerSupport)
		await log(
			`${LoggingEmojis.SettingsChange} Server ${
				developerSupport ? "" : "un"
			}marked as a Developer Support Server`,
			"server",
		);
	const discoverable = newGuild.features.includes("DISCOVERABLE");
	if (oldGuild.features.includes("DISCOVERABLE") !== discoverable)
		await log(
			`${LoggingEmojis.SettingsChange} Discovery ${discoverable ? "en" : "dis"}abled`,
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
		await log(
			`${LoggingEmojis.Invites} Invites ${invitesDisabled ? "" : "un"}paused`,
			"members",
		);
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
				LoggingEmojis.SettingsChange
			} “Members must accept rules before they can talk or DM” ${
				screening ? "en" : "dis"
			}abled`,
			"server",
		);
	const subscriptions = newGuild.features.includes("ROLE_SUBSCRIPTIONS_ENABLED");
	if (oldGuild.features.includes("ROLE_SUBSCRIPTIONS_ENABLED") !== subscriptions)
		await log(
			`${LoggingEmojis.SettingsChange} Role Subscriptions ${
				subscriptions ? "en" : "dis"
			}abled`,
			"server",
		);
	const ticketedEvents = newGuild.features.includes("TICKETED_EVENTS_ENABLED");
	if (oldGuild.features.includes("TICKETED_EVENTS_ENABLED") !== ticketedEvents)
		await log(
			`${LoggingEmojis.SettingsChange} Ticketed events ${ticketedEvents ? "en" : "dis"}abled`,
			"server",
		);
	const welcomeScreen = newGuild.features.includes("WELCOME_SCREEN_ENABLED");
	if (oldGuild.features.includes("WELCOME_SCREEN_ENABLED") !== welcomeScreen)
		await log(
			`${LoggingEmojis.SettingsChange} Welcome Screen ${welcomeScreen ? "en" : "dis"}abled`,
			"server",
		);

	if (oldGuild.icon !== newGuild.icon) {
		const url = newGuild.iconURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingsChange} Server icon ${url ? "changed" : "removed"}`,
			"server",
			{ files: url ? [{ url }] : [] },
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
			`${LoggingEmojis.SettingsChange} “Require 2FA for moderator actions” ${
				{ [GuildMFALevel.None]: "dis", [GuildMFALevel.Elevated]: "en" }[newGuild.mfaLevel]
			}abled`,
			"server",
		);
	}
	if (oldGuild.name !== newGuild.name)
		await log(`${LoggingEmojis.SettingsChange} Server renamed to ${newGuild.name}`, "server");

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
			`${LoggingEmojis.SettingsChange} Ownership transferred to <@${newGuild.ownerId}>`,
			"server",
		);

	if (oldGuild.partnered !== newGuild.partnered)
		await log(
			`${LoggingEmojis.ServerUpdate} Server ${newGuild.partnered ? "" : "un"}partnered`,
			"server",
		);

	if (oldGuild.preferredLocale !== newGuild.preferredLocale)
		await log(
			`${LoggingEmojis.SettingsChange} Server primary language switched to ${
				Object.entries(Locale).find(
					([, locale]) => locale === newGuild.preferredLocale,
				)?.[0] ?? newGuild.preferredLocale
			}`,
			"server",
		);

	if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled)
		await log(
			`${LoggingEmojis.SettingsChange} Boost progress bar ${
				newGuild.premiumProgressBarEnabled ? "shown" : "hidden"
			}`,
			"server",
		);

	if (oldGuild.publicUpdatesChannel?.id !== newGuild.publicUpdatesChannel?.id) {
		await log(
			`${LoggingEmojis.SettingsChange} Community updates channel ${
				newGuild.publicUpdatesChannel
					? `set to ${newGuild.publicUpdatesChannel.toString()}`
					: "unset"
			}`,
			"server",
		);
	}
	if (oldGuild.rulesChannel?.id !== newGuild.rulesChannel?.id) {
		await log(
			`${LoggingEmojis.SettingsChange} Rules or guidelines channel ${
				newGuild.rulesChannel ? `set to ${newGuild.rulesChannel.toString()}` : "unset"
			}`,
			"server",
		);
	}
	if (oldGuild.splash !== newGuild.splash) {
		const url = newGuild.splashURL({ size: 128 });
		await log(
			`${LoggingEmojis.SettingsChange} Server invite background ${
				url ? "changed" : "removed"
			}`,
			"server",
			{ files: url ? [{ url }] : [] },
		);
	}
	if (oldGuild.systemChannel?.id !== newGuild.systemChannel?.id) {
		await log(
			`${LoggingEmojis.SettingsChange} System messages channel ${
				newGuild.systemChannel ? `set to ${newGuild.systemChannel.toString()}` : "unset"
			}`,
			"server",
		);
	}
	const serverSetup = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressGuildReminderNotifications,
	);
	if (
		oldGuild.systemChannelFlags.has(
			GuildSystemChannelFlags.SuppressGuildReminderNotifications,
		) !== serverSetup
	)
		await log(
			`${LoggingEmojis.SettingsChange} “Send helpful tips for server setup” ${
				serverSetup ? "en" : "dis"
			}abled`,
			"server",
		);
	const joinReplies = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressJoinNotificationReplies,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotificationReplies) !==
		joinReplies
	)
		await log(
			`${
				LoggingEmojis.SettingsChange
			} “Prompt members to reply to welcome messages with a sticker.” ${
				joinReplies ? "en" : "dis"
			}abled`,
			"server",
		);
	const joins = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressJoinNotifications,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressJoinNotifications) !== joins
	)
		await log(
			`${
				LoggingEmojis.SettingsChange
			} “Send a random welcome message when someone joins this server.” ${
				joins ? "en" : "dis"
			}abled`,
			"server",
		);
	const boosts = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressPremiumSubscriptions,
	);
	if (
		oldGuild.systemChannelFlags.has(GuildSystemChannelFlags.SuppressPremiumSubscriptions) !==
		boosts
	)
		await log(
			`${LoggingEmojis.SettingsChange} “Send a message when someone boosts this server.” ${
				boosts ? "en" : "dis"
			}abled`,
			"server",
		);
	const subscriptionReplies = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotificationReplies,
	);
	if (
		oldGuild.systemChannelFlags.has(
			GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotificationReplies,
		) !== subscriptionReplies
	)
		await log(
			`${
				LoggingEmojis.SettingsChange
			} “Prompt members to reply to Server Subscription congratulation messages with a sticker” ${
				subscriptionReplies ? "en" : "dis"
			}abled`,
			"server",
		);
	const subscriptionNotifs = newGuild.systemChannelFlags.has(
		GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotifications,
	);
	if (
		oldGuild.systemChannelFlags.has(
			GuildSystemChannelFlags.SuppressRoleSubscriptionPurchaseNotifications,
		) !== subscriptionNotifs
	)
		await log(
			`${
				LoggingEmojis.SettingsChange
			} “Send a message when someone purchases or renews a Server Subscripton” ${
				subscriptionNotifs ? "en" : "dis"
			}abled`,
			"server",
		);
	if (oldGuild.vanityURLCode !== newGuild.vanityURLCode)
		await log(
			`${LoggingEmojis.SettingsChange} Custom invite link set to ${newGuild.vanityURLCode}`,
			"server",
		);

	if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
		await log(
			`${LoggingEmojis.SettingsChange} Verification level set to “${
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
	if (invite.guild?.id !== CONSTANTS.guild.id) return;
	await log(
		`${LoggingEmojis.Invites} Invite ${invite.code} deleted${
			invite.uses === null ? "" : ` with ${invite.uses} uses`
		}!`,
		"members",
	);
});

defineEvent("messageReactionRemoveAll", async (partialMessage, reactions) => {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	if (!shouldLog(message.channel)) return;

	await log(
		`${
			LoggingEmojis.Reactions
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
				},
			],

			button: {
				label: "View Context",
				url: message.url,
			},
		},
	);
});

defineEvent("roleCreate", async (role) => {
	if (role.guild.id !== CONSTANTS.guild.id) return;
	await log(`${LoggingEmojis.Roles} Role ${role.toString()} created!`, "server");
});

defineEvent("roleDelete", async (role) => {
	if (role.guild.id !== CONSTANTS.guild.id) return;
	await log(`${LoggingEmojis.Roles} Role @${role.name} deleted! (ID: ${role.id})`, "server");
});
