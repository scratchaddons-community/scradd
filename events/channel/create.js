import { ChannelType } from "discord.js";
import log from "../../common/moderation/logging.js";

/** @type {import("../../common/types/event").default<"channelCreate">} */
export default async function event(channel) {
	if (channel.guild.id !== process.env.GUILD_ID) return;
	await log(
		`📃 ${
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
}
