import {
	AttachmentBuilder,
	ChannelType,
	escapeMarkdown,
	ThreadAutoArchiveDuration,
	VideoQualityMode,
} from "discord.js";
import log from "../../common/moderation/logging.js";
import difflib from "difflib";

/** @type {import("../../common/types/event").default<"channelUpdate">} */
export default async function event(oldChannel, newChannel) {
	if (
		newChannel.isDMBased() ||
		oldChannel.isDMBased() ||
		newChannel.guild.id !== process.env.GUILD_ID
	)
		return;
	const edits = [];
	if (oldChannel.name !== newChannel.name)
		edits.push(" was renamed to " + escapeMarkdown(newChannel.name));
	if (oldChannel.type !== newChannel.type)
		edits.push(
			" was made into a" +
				{
					[ChannelType.GuildText]: " text",
					[ChannelType.GuildVoice]: " voice",
					[ChannelType.GuildCategory]: " category",
					[ChannelType.GuildNews]: "n announcement",
					[ChannelType.GuildStageVoice]: " stage",
				}[newChannel.type] +
				" channel",
		);

	if (oldChannel.rawPosition !== newChannel.rawPosition)
		edits.push(" was moved to position " + newChannel.rawPosition);

	if (oldChannel.isTextBased() && newChannel.isTextBased()) {
		if (oldChannel.nsfw !== newChannel.nsfw)
			edits.push(` was made ${newChannel.nsfw ? "" : "non-"}age-restricted`);

		oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser &&
			edits.push("’s slowmode was set to " + newChannel.rateLimitPerUser + " seconds");
	}

	if (oldChannel.isVoiceBased() && newChannel.isVoiceBased()) {
		oldChannel.bitrate !== newChannel.bitrate &&
			edits.push("’s bitrate was set to " + newChannel.bitrate + "kbps");

		oldChannel.userLimit !== newChannel.userLimit &&
			edits.push(
				"’s user limit was " + newChannel.userLimit
					? "set to " + newChannel.userLimit + " users"
					: "removed",
			);

		oldChannel.rtcRegion !== newChannel.rtcRegion &&
			edits.push("’s region override was set to " + newChannel.rtcRegion || "Automatic");
	}

	if (
		(oldChannel.type === ChannelType.GuildText || oldChannel.type === ChannelType.GuildNews) &&
		(newChannel.type === ChannelType.GuildText || newChannel.type === ChannelType.GuildNews)
	) {
		if (oldChannel.topic !== newChannel.topic) {
			log(`✏ Channel ${newChannel.toString()}’s topic was changed!`, "channels", {
				files: [
					new AttachmentBuilder(
						Buffer.from(
							difflib
								.unifiedDiff(
									(oldChannel.topic || "").split("\n"),
									(newChannel.topic || "").split("\n"),
								)
								.join("\n")
								.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
							"utf-8",
						),
						{ name: "topic.diff" },
					),
				],
			});
		}

		oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration &&
			edits.push(
				"’s hide after inactivity time was set to " +
					{
						[ThreadAutoArchiveDuration.OneHour]: "1 Hour",
						[ThreadAutoArchiveDuration.OneDay]: "24 Hours",
						[ThreadAutoArchiveDuration.ThreeDays]: "3 Days",
						[ThreadAutoArchiveDuration.OneWeek]: "1 Week",
					}[newChannel.defaultAutoArchiveDuration || ThreadAutoArchiveDuration.OneDay] ||
					newChannel.defaultAutoArchiveDuration,
			);
	}

	if (oldChannel.type === ChannelType.GuildVoice && newChannel.type === ChannelType.GuildVoice)
		oldChannel.videoQualityMode !== newChannel.videoQualityMode &&
			edits.push(
				`’s video quality set to ${
					{
						[VideoQualityMode.Auto]: "Auto",
						[VideoQualityMode.Full]: "720p",
					}[newChannel.videoQualityMode || VideoQualityMode.Auto]
				}`,
			);

	await Promise.all(
		edits.map((edit) => log(`✏ Channel ${newChannel.toString()}${edit}!`, "channels")),
	);
}
