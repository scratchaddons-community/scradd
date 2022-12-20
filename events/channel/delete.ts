import { ChannelType } from "discord.js";

import CONSTANTS from "../../common/CONSTANTS.js";
import log from "../../common/logging.js";

import type Event from "../../common/types/event";

const event: Event<"channelDelete"> = async function event(channel) {
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
};
export default event;
