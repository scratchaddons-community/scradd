import log from "../../../../common/moderation/logging.js";

/** @type {import("../../../../types/event").default<"guildScheduledEventDelete">} */
const event = {
	async event(event) {
		const guild = event.guild || (await this.guilds.fetch(event.guildId));
		if (guild.id !== process.env.GUILD_ID) return;

		await log(guild, `Event ${event.name} removed!`, "server");
	},
};

export default event;
