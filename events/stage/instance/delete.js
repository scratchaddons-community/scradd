import log from "../../../common/moderation/logging.js";

/** No idea why we need this but fsr we do. */
const ALREADY_ENDED = new Set();

/** @type {import("../../../types/event").default<"stageInstanceCreate">} */
const event = {
	async event(instance) {
		const guild = instance.guild || (await this.guilds.fetch(instance.guildId));
		if (guild.id !== process.env.GUILD_ID || ALREADY_ENDED.has(instance.id)) return;
		ALREADY_ENDED.add(instance.id);
		await log(guild, `📷 Stage ${instance.channel?.toString()} is no longer live!`, "voice");
	},
};

export default event;
