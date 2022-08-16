import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"webhookUpdate">} */
const event = {
	async event(channel) {
		if (channel.guild.id !== process.env.GUILD_ID) return;

		await log(channel.guild, `🌐 Webhooks updated in ${channel.toString()}!`, "voice");
	},
};

export default event;
