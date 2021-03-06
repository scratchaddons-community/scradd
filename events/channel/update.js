import { Util } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"channelUpdate">} */
const event = {
	async event(oldChannel, newChannel) {
		if (
			newChannel.type === "DM" ||
			oldChannel.type === "DM" ||
			newChannel.guild.id !== process.env.GUILD_ID
		)
			return;
		const edits = [];
		oldChannel.name !== newChannel.name &&
			edits.push(" was renamed to " + Util.escapeMarkdown(newChannel.name));
		oldChannel.type !== newChannel.type &&
			edits.push(
				" was made into a" +
					{
						GUILD_CATEGORY: " category",
						GUILD_NEWS: "n announcement",
						GUILD_STAGE_VOICE: " stage",
						GUILD_STORE: " store",
						GUILD_TEXT: " text",
						GUILD_VOICE: " voice",
					}[newChannel.type] +
					" channel",
			);

		oldChannel.rawPosition !== newChannel.rawPosition &&
			edits.push(" was moved to position " + newChannel.rawPosition);
		if (oldChannel.isText() && newChannel.isText()) {
			!oldChannel.nsfw && newChannel.nsfw && edits.push(" was made age-restricted");
			oldChannel.nsfw && !newChannel.nsfw && edits.push(" was made non-age-restricted");
			oldChannel.topic !== newChannel.topic &&
				edits.push("'s topic was set to " + newChannel.topic);
			oldChannel.defaultAutoArchiveDuration !== newChannel.defaultAutoArchiveDuration &&
				edits.push(
					"'s default archive after inactivity time was set to " +
						{
							60: "1 Hour",
							1_440: "24 Hours",
							4_320: "3 Days",
							10_080: "1 Week",
							MAX: "",
						}[newChannel.defaultAutoArchiveDuration || 1_440] ||
						newChannel.defaultAutoArchiveDuration,
				);
		}
		oldChannel.type === "GUILD_TEXT" &&
			newChannel.type === "GUILD_TEXT" &&
			oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser &&
			edits.push("'s slowmode was set to " + newChannel.rateLimitPerUser + " seconds");
		if (oldChannel.isVoice() && newChannel.isVoice()) {
			oldChannel.bitrate !== newChannel.bitrate &&
				edits.push("'s bitrate was set to " + newChannel.bitrate + "kbps");
			oldChannel.userLimit !== newChannel.userLimit &&
				edits.push("'s user limit was set to " + newChannel.userLimit + " users");
			oldChannel.rtcRegion !== newChannel.rtcRegion &&
				edits.push("'s region override was set to " + newChannel.rtcRegion);
		}

		await Promise.all(
			edits.map((edit) =>
				log(newChannel.guild, `Channel ${newChannel.toString()}${edit}!`, "channels"),
			),
		);
	},
};

export default event;
