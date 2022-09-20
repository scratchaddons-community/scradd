import { ChannelType } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../common/types/event").default<"channelDelete">} */
export default async function event(channel) {
	if (channel.isDMBased() || channel.guild.id !== process.env.GUILD_ID) return;
	await log(
		`🗑 ${
			{
				[ChannelType.GuildText]: "Text",
				[ChannelType.GuildVoice]: "Voice",
				[ChannelType.GuildCategory]: "Category",
				[ChannelType.GuildNews]: "Announcement",
				[ChannelType.GuildStageVoice]: "Stage",
				[ChannelType.GuildForum]: "Forum",
			}[channel.type]
		} channel #${channel.name} deleted! (ID: ${channel.id})`,
		"channels",
	);
}
