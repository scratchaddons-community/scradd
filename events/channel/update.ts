import difflib from "difflib";
import {
	ChannelType,
	escapeMarkdown,
	SortOrderType,
	ThreadAutoArchiveDuration,
	VideoQualityMode,
} from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"channelUpdate"> = async function event(oldChannel, newChannel) {
	if (
		newChannel.isDMBased() ||
		oldChannel.isDMBased() ||
		newChannel.guild.id !== CONSTANTS.guild.id
	)
		return;
	const edits = [];
	if (oldChannel.name !== newChannel.name)
		edits.push(` was renamed to ${escapeMarkdown(newChannel.name)}`);
	if (oldChannel.type !== newChannel.type) {
		edits.push(
			` was made into a${
				{
					[ChannelType.GuildText]: " text",
					[ChannelType.GuildVoice]: " voice",
					[ChannelType.GuildCategory]: " category",
					[ChannelType.GuildAnnouncement]: "n announcement",
					[ChannelType.GuildStageVoice]: " stage",
					[ChannelType.GuildForum]: " forum",
				}[newChannel.type]
			} channel`,
		);
	}

	if (oldChannel.rawPosition !== newChannel.rawPosition)
		edits.push(` was moved to position ${newChannel.rawPosition}`);

	if (oldChannel.isVoiceBased() && newChannel.isVoiceBased()) {
		if (oldChannel.bitrate !== newChannel.bitrate)
			edits.push(`’s bitrate was set to ${newChannel.bitrate}kbps`);

		if (oldChannel.userLimit !== newChannel.userLimit)
			edits.push(
				`’s user limit was ${
					newChannel.userLimit ? `set to ${newChannel.userLimit} users` : "removed"
				}`,
			);

		if (oldChannel.rtcRegion !== newChannel.rtcRegion)
			edits.push(`’s region override was set to ${newChannel.rtcRegion || "Automatic"}`);
	}

	if (
		(oldChannel.type === ChannelType.GuildText || oldChannel.type === ChannelType.GuildForum) &&
		(newChannel.type === ChannelType.GuildText || newChannel.type === ChannelType.GuildForum)
	) {
		if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
			edits.push(
				`’s ${
					newChannel.type === ChannelType.GuildForum ? "post " : ""
				}slowmode was set to ${newChannel.rateLimitPerUser} seconds`,
			);
	}

	if (
		(oldChannel.type === ChannelType.GuildText ||
			oldChannel.type === ChannelType.GuildForum ||
			oldChannel.type === ChannelType.GuildAnnouncement) &&
		(newChannel.type === ChannelType.GuildText ||
			newChannel.type === ChannelType.GuildForum ||
			newChannel.type === ChannelType.GuildAnnouncement)
	) {
		if (oldChannel.nsfw !== newChannel.nsfw)
			edits.push(` was made ${newChannel.nsfw ? "" : "non-"}age-restricted`);

		if (oldChannel.topic !== newChannel.topic) {
			await log(`✏ Channel ${newChannel.toString()}’s topic was changed!`, "channels", {
				files: [
					{
						attachment: Buffer.from(
							difflib
								.unifiedDiff(
									(oldChannel.topic ?? "").split("\n"),
									(newChannel.topic ?? "").split("\n"),
								)
								.join("\n")
								.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
							"utf8",
						),

						name: "topic.diff",
					},
				],
			});
		}

		if (oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration)
			edits.push(
				`’s hide after inactivity time was set to ${
					{
						[ThreadAutoArchiveDuration.OneHour]: "1 Hour",
						[ThreadAutoArchiveDuration.OneDay]: "24 Hours",
						[ThreadAutoArchiveDuration.ThreeDays]: "3 Days",
						[ThreadAutoArchiveDuration.OneWeek]: "1 Week",
					}[newChannel.defaultAutoArchiveDuration || ThreadAutoArchiveDuration.OneDay]
				}` || newChannel.defaultAutoArchiveDuration,
			);
	}

	if (oldChannel.type === ChannelType.GuildForum && newChannel.type === ChannelType.GuildForum) {
		// TODO // oldChannel.availableTags;

		if (
			oldChannel.defaultReactionEmoji?.id !== newChannel.defaultReactionEmoji?.id ||
			oldChannel.defaultReactionEmoji?.name !== newChannel.defaultReactionEmoji?.name
		) {
			edits.push(
				`’s default reaction${
					newChannel.defaultReactionEmoji
						? ` was set to ${
								newChannel.defaultReactionEmoji.name ||
								`<:_:${newChannel.defaultReactionEmoji.id}>`
						  }`
						: " removed"
				}`,
			);
		}

		if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser)
			edits.push(`’s message slowmode was set to ${newChannel.rateLimitPerUser} seconds`);

		if (oldChannel.defaultSortOrder !== newChannel.defaultSortOrder)
			edits.push(
				`’s sort order was ${
					newChannel.defaultSortOrder
						? `set to ${
								{
									[SortOrderType.CreationDate]: "Creation Time",
									[SortOrderType.LatestActivity]: "Recent Activity",
								}[newChannel.defaultSortOrder]
						  }`
						: "unset"
				}`,
			);
	}

	if (oldChannel.type === ChannelType.GuildVoice && newChannel.type === ChannelType.GuildVoice) {
		if (oldChannel.videoQualityMode !== newChannel.videoQualityMode)
			edits.push(
				`’s video quality set to ${
					{ [VideoQualityMode.Auto]: "Auto", [VideoQualityMode.Full]: "720p" }[
						newChannel.videoQualityMode ?? VideoQualityMode.Auto
					]
				}`,
			);
	}

	await Promise.all(
		edits.map(
			async (edit) => await log(`✏ Channel ${newChannel.toString()}${edit}!`, "channels"),
		),
	);
};
export default event;
