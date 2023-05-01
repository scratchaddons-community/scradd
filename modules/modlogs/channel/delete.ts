import { ChannelType } from "discord.js";

import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("channelDelete", async (channel) => {
	if (channel.isDMBased() || channel.guild.id !== CONSTANTS.guild.id) return;
	await log(
		`🗑 ${
			{
				[ChannelType.GuildText]: "Text",
				[ChannelType.GuildVoice]: "Voice",
				[ChannelType.GuildCategory]: "Category",
				[ChannelType.GuildAnnouncement]: "Announcement",
				[ChannelType.GuildStageVoice]: "Stage",
				[ChannelType.GuildForum]: "Forum",
			}[channel.type]
		} channel #${channel.name} deleted! (ID: ${channel.id})`,
		"channels",
	);
});
