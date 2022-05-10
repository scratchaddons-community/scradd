import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventDelete">} */
const event = {
	async event(event) {
		if (!event.guild || event.guild.id !== process.env.GUILD_ID) return;

		await log(event.guild, `Event ${event.name} removed!`, "server");
	},
};

export default event;
