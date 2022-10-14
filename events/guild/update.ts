import {
	GuildDefaultMessageNotifications,
	GuildExplicitContentFilter,
	GuildMFALevel,
	GuildNSFWLevel,
	GuildVerificationLevel,
} from "discord.js";
import log from "../../common/moderation/logging.js";
import difflib from "difflib";
import type Event from "../../common/types/event";

const event: Event<"guildUpdate"> = async function event(oldGuild, newGuild) {
	if (newGuild.id !== process.env.GUILD_ID) return;

	const logs = [];
	if (oldGuild.afkChannel?.id !== newGuild.afkChannel?.id) {
		logs.push(
			`Inactive channel set to ${newGuild.afkChannel?.toString() || "No inactive channel"}`,
		);
	}
	if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
		logs.push(`Inactive timeout set to ${newGuild.afkTimeout}`);
	}
	if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
		logs.push(
			`Server banner background ${
				newGuild.bannerURL() ? `set to <${newGuild.bannerURL()}>` : newGuild.nameAcronym
			}`,
		);
	}
	if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
		logs.push(
			`Default notification settings set to "${
				{
					[GuildDefaultMessageNotifications.AllMessages]: "All messages",
					[GuildDefaultMessageNotifications.OnlyMentions]: "Only @mentions",
				}[newGuild.defaultMessageNotifications]
			}"`,
		);
	}
	if (oldGuild.description !== newGuild.description) {
		log(`✏ Server description was changed!`, "server", {
			files: [
				{
					attachment: Buffer.from(
						difflib
							.unifiedDiff(
								(oldGuild.description || "").split("\n"),
								(newGuild.description || "").split("\n"),
							)
							.join("\n")
							.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
						"utf-8",
					),
					name: "description.diff",
				},
			],
		});
	}
	if (oldGuild.discoverySplashURL() !== newGuild.discoverySplashURL()) {
		logs.push(
			`Server discovery listing cover image ${
				newGuild.discoverySplashURL()
					? `set to <${newGuild.discoverySplashURL()}>`
					: "removed"
			}`,
		);
	}
	if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
		logs.push(
			`Explicit media content filter set to "${
				{
					[GuildExplicitContentFilter.Disabled]: "Don't scan any media content.",
					[GuildExplicitContentFilter.MembersWithoutRoles]:
						"Scan media content from members without a role.",
					[GuildExplicitContentFilter.AllMembers]: "Scan media content from all members.",
				}[newGuild.explicitContentFilter]
			}"`,
		);
	}
	if (oldGuild.features.includes("COMMUNITY") !== newGuild.features.includes("COMMUNITY")) {
		logs.push(`Community ${newGuild.features.includes("COMMUNITY") ? "en" : "dis"}abled`);
	}
	if (oldGuild.features.includes("DISCOVERABLE") !== newGuild.features.includes("DISCOVERABLE")) {
		logs.push(
			`Server Discovery ${newGuild.features.includes("DISCOVERABLE") ? "en" : "dis"}abled`,
		);
	}
	if (oldGuild.features.includes("FEATURABLE") !== newGuild.features.includes("FEATURABLE")) {
		logs.push(
			`Server ${
				newGuild.features.includes("FEATURABLE") ? "" : "un "
			}featured on Server Discovery`,
		);
	}
	if (
		oldGuild.features.includes("INVITES_DISABLED") !==
		newGuild.features.includes("INVITES_DISABLED")
	) {
		logs.push(`Invites ${newGuild.features.includes("INVITES_DISABLED") ? "" : "un"}paused`);
	}
	if (
		oldGuild.features.includes("HAS_DIRECTORY_ENTRY") !==
		newGuild.features.includes("HAS_DIRECTORY_ENTRY")
	) {
		logs.push(
			`Server ${
				newGuild.features.includes("HAS_DIRECTORY_ENTRY") ? "add" : "remov"
			}ed from a directory channel`,
		);
	}
	if (oldGuild.features.includes("HUB") !== newGuild.features.includes("HUB")) {
		logs.push(`Server ${newGuild.features.includes("HUB") ? "" : "un"}made a Student Hub`);
	}
	if (
		oldGuild.features.includes("LINKED_TO_HUB") !== newGuild.features.includes("LINKED_TO_HUB")
	) {
		logs.push(
			`Server ${
				newGuild.features.includes("LINKED_TO_HUB") ? "add" : "remov"
			}ed from a Student Hub`,
		);
	}
	if (
		oldGuild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED") !==
		newGuild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED")
	) {
		logs.push(
			`Rules screening ${
				newGuild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED") ? "en" : "dis"
			}abled`,
		);
	}
	if (
		oldGuild.features.includes("MONETIZATION_ENABLED") !==
		newGuild.features.includes("MONETIZATION_ENABLED")
	) {
		logs.push(
			`Monetization ${
				newGuild.features.includes("MONETIZATION_ENABLED") ? "en" : "dis"
			}abled`,
		);
	}
	if (
		oldGuild.features.includes("TICKETED_EVENTS_ENABLED") !==
		newGuild.features.includes("TICKETED_EVENTS_ENABLED")
	) {
		logs.push(
			`Ticketed events ${
				newGuild.features.includes("TICKETED_EVENTS_ENABLED") ? "en" : "dis"
			}abled`,
		);
	}
	if (
		oldGuild.features.includes("WELCOME_SCREEN_ENABLED") !==
		newGuild.features.includes("WELCOME_SCREEN_ENABLED")
	) {
		logs.push(
			`Welcome Screen ${
				newGuild.features.includes("WELCOME_SCREEN_ENABLED") ? "en" : "dis"
			}abled`,
		);
	}
	if (oldGuild.iconURL() !== newGuild.iconURL()) {
		logs.push(
			`Server icon ${newGuild.iconURL() ? `set to <${newGuild.iconURL()}>` : "removed"}`,
		);
	}
	if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
		logs.push(
			`2FA requirement for moderation ${
				{ [GuildMFALevel.None]: "dis", [GuildMFALevel.Elevated]: "en" }[newGuild.mfaLevel]
			}abled`,
		);
	}
	if (oldGuild.name !== newGuild.name) {
		logs.push(`Server renamed to ${newGuild.name}`);
	}
	if (oldGuild.nsfwLevel !== newGuild.nsfwLevel) {
		logs.push(
			"Server " +
				(newGuild.nsfwLevel === GuildNSFWLevel.Default
					? "unmarked as NSFW"
					: `marked as ${
							{
								[GuildNSFWLevel.Explicit]: "18+",
								[GuildNSFWLevel.Safe]: "safe",
								[GuildNSFWLevel.AgeRestricted]: "13+",
							}[newGuild.nsfwLevel]
					  }`),
		);
	}
	if (oldGuild.ownerId !== newGuild.ownerId) {
		logs.push(`Server transferred to <@${newGuild.ownerId}>`);
	}
	if (oldGuild.partnered !== newGuild.partnered) {
		logs.push(`Server ${newGuild.partnered ? "" : "un"}partnered`);
	}
	if (oldGuild.preferredLocale !== newGuild.preferredLocale) {
		logs.push(`Server primary language switched to ${newGuild.preferredLocale}`);
	}
	if (oldGuild.premiumProgressBarEnabled !== newGuild.premiumProgressBarEnabled) {
		logs.push(`Boost progress bar ${newGuild.premiumProgressBarEnabled ? "shown" : "hidden"}`);
	}
	if (oldGuild.publicUpdatesChannel?.id !== newGuild.publicUpdatesChannel?.id) {
		logs.push(
			"Community updates channel " +
				(newGuild.publicUpdatesChannel
					? "set to " + newGuild.publicUpdatesChannel.toString()
					: "unset"),
		);
	}
	if (oldGuild.rulesChannel?.id !== newGuild.rulesChannel?.id) {
		logs.push(
			"Rules or guidelines channel " +
				(newGuild.rulesChannel ? "set to " + newGuild.rulesChannel.toString() : "unset"),
		);
	}
	if (oldGuild.splashURL() !== newGuild.splashURL()) {
		logs.push(
			`Server invite background ${
				newGuild.splashURL() ? `set to <${newGuild.splashURL()}>` : "removed"
			}`,
		);
	}
	if (oldGuild.systemChannel !== newGuild.systemChannel) {
		logs.push(
			"System messages channel " +
				(newGuild.systemChannel ? "set to " + newGuild.systemChannel.toString() : "unset"),
		);
	}
	if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
		logs.push(`Custom invite link set to ${newGuild.vanityURLCode}`);
	}
	if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
		logs.push(
			`Verification level set to "${
				{
					[GuildVerificationLevel.None]: "Unrestricted",
					[GuildVerificationLevel.Low]:
						"Must have a verified email on their Discord account.",
					[GuildVerificationLevel.Medium]:
						"Must also be registered on Discord for longer than 5 minutes.",
					[GuildVerificationLevel.High]:
						"Must also be a member of this server for longer than 10 minutes.",
					[GuildVerificationLevel.VeryHigh]:
						"Must have a verified phone on their Discord account.",
				}[newGuild.verificationLevel]
			}"`,
		);
	}
	if (oldGuild.verified !== newGuild.verified) {
		logs.push(`Server ${newGuild.verified ? "" : "un"}verified`);
	}
	if (newGuild.widgetEnabled && oldGuild.widgetChannel?.id !== newGuild.widgetChannel?.id) {
		logs.push(
			`Server widget invite channel ${
				newGuild.widgetChannel ? "set to " + newGuild.widgetChannel.toString() : "unset"
			}`,
		);
	}
	if (!!oldGuild.widgetEnabled !== !!newGuild.widgetEnabled) {
		logs.push(`Server widget ${newGuild.widgetEnabled ? "en" : "dis"}abled`);
	}
	if (oldGuild.maxVideoChannelUsers !== newGuild.maxVideoChannelUsers) {
		logs.push(
			`The max number of users allowed in a video channel changed to ${newGuild.maxVideoChannelUsers}`,
		);
	}
	if (
		oldGuild.systemChannelFlags.has("SuppressGuildReminderNotifications") !==
		newGuild.systemChannelFlags.has("SuppressGuildReminderNotifications")
	) {
		logs.push(
			`Helpful tips for server setup ${
				newGuild.systemChannelFlags.has("SuppressGuildReminderNotifications") ? "dis" : "en"
			}abled`,
		);
	}
	if (
		oldGuild.systemChannelFlags.has("SuppressJoinNotificationReplies") !==
		newGuild.systemChannelFlags.has("SuppressJoinNotificationReplies")
	) {
		logs.push(
			`Prompt to reply to welcome messages with a sticker ${
				newGuild.systemChannelFlags.has("SuppressJoinNotificationReplies") ? "dis" : "en"
			}abled`,
		);
	}
	if (
		oldGuild.systemChannelFlags.has("SuppressJoinNotifications") !==
		newGuild.systemChannelFlags.has("SuppressJoinNotifications")
	) {
		logs.push(
			`Random welcome messages when someone joins this server ${
				newGuild.systemChannelFlags.has("SuppressJoinNotifications") ? "dis" : "en"
			}abled`,
		);
	}
	if (
		oldGuild.systemChannelFlags.has("SuppressPremiumSubscriptions") !==
		newGuild.systemChannelFlags.has("SuppressPremiumSubscriptions")
	) {
		logs.push(
			`Messages when someone boosts this server ${
				newGuild.systemChannelFlags.has("SuppressPremiumSubscriptions") ? "dis" : "en"
			}abled`,
		);
	}

	await Promise.all(logs.map((edit) => log("✏ " + edit + `!`, "server")));
};
export default event;
