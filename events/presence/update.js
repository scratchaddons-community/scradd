import warn from "../../common/moderation/warns.js";
import { badWordsAllowed, censor } from "../../common/moderation/automod.js";

/** @type {import("../../types/event").default<"presenceUpdate">} */
const event = {
	async event(_, newPresence) {
		if (newPresence.guild?.id !== process.env.GUILD_ID) return;

		const activity = newPresence.activities[0];
		const member = newPresence.member;

		const censored = censor(activity?.state || activity?.name || "");
		if (censored && !member?.roles.resolve(process.env.MOD_ROLE || "")) {
			await member?.send(
				"As a mod, you should set an example for the server, so please refrain from swears in your status. Thanks!",
			);
		}
	},
};

export default event;
