import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"channelDelete">} */
const event = {
	async event(channel) {
		if (channel.type === "DM" || channel.guild.id !== process.env.GUILD_ID) return;
		await log(
			channel.guild,
			`${
				{
					GUILD_CATEGORY: "Category",
					GUILD_NEWS: "Announcement",
					GUILD_STAGE_VOICE: "Stage",
					GUILD_STORE: "Store",
					GUILD_TEXT: "Text",
					GUILD_VOICE: "Voice",
				}[channel.type]
			} channel #${channel.name} deleted! (ID ${channel.id})`,
			"channels",
		);
	},
};

export default event;
