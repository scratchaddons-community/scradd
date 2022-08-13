import { ChannelType } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"channelCreate">} */
const event = {
	async event(channel) {
		if (channel.guild.id !== process.env.GUILD_ID) return;
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
			} channel ${channel.toString()} (${channel.name}) created${
				channel.parent ? ` under <#${channel.parent.id}>` : ""
			}!`,
			"channels",
		);
	},
};

export default event;
