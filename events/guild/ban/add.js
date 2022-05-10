import log from "../../../common/moderation/logging.js";

/** @type {import("../../../types/event").default<"guildBanAdd">} */
const event = {
	async event(ban) {
		if (ban.partial) ban = await ban.fetch();
		if (ban.guild.id !== process.env.GUILD_ID) return;
		await log(
			ban.guild,
			`${ban.user.toString()} banned${ban.reason ? ` - ${ban.reason}` : "!"}`,
			"members",
		);
	},
};

export default event;
