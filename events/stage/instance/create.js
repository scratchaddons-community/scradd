import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"stageInstanceCreate">} */
const event = {
	async event(instance) {
		const guild = instance.guild || (await this.guilds.fetch(instance.guildId));

		if (guild.id !== process.env.GUILD_ID) return;
		await log(
			guild,
			`📸 Stage ${instance.channel?.toString()} went live${
				instance.guildScheduledEvent
					? `for the ${instance.guildScheduledEvent.name} event`
					: ""
			} - ${instance.topic}`,
			"voice",
		);
	},
};

export default event;
