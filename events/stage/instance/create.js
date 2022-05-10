import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"stageInstanceCreate">} */
const event = {
	async event(instance) {
		if (!instance.guild || instance.guild.id !== process.env.GUILD_ID) return;
		await log(
			instance.guild,
			`Stage ${instance.channel?.toString()} went live - ${instance.topic}`,
			"channels",
		);
	},
};

export default event;
