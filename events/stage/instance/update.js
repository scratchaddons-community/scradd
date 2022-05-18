import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"stageInstanceUpdate">} */
const event = {
	async event(oldInstance, newInstance) {
		const guild =
			newInstance.guild || (await newInstance.client.guilds.fetch(newInstance.guildId));
		if (!oldInstance || guild.id !== process.env.GUILD_ID) return;

		const logs = [];
		if (oldInstance.discoverableDisabled !== newInstance.discoverableDisabled) {
			logs.push(` discovery ${newInstance.discoverableDisabled ?? true ? "dis" : "en"}abled`);
		}
		if (oldInstance.topic !== newInstance.topic) {
			logs.push(`'s topic set to ${newInstance.topic}`);
		}

		await Promise.all(
			logs.map((edit) =>
				log(guild, `Stage ${newInstance.channel?.toString()}` + edit + `!`, "voice"),
			),
		);
	},
};

export default event;
