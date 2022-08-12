import { ChannelType } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"channelDelete">} */
const event = {
	async event(channel) {
		if (channel.isDMBased() || channel.guild.id !== process.env.GUILD_ID) return;
		await log(
			channel.guild,
			`${
				{
					[ChannelType.GuildText]: "Text",
					[ChannelType.GuildVoice]: "Voice",
					[ChannelType.GuildCategory]: "Category",
					[ChannelType.GuildNews]: "Announcement",
					[ChannelType.GuildStageVoice]: "Stage",
				}[channel.type]
			} channel #${channel.name} deleted! (ID ${channel.id})`,
			"channels",
		);
	},
};

export default event;
