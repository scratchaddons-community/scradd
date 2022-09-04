import { ActivityType } from "discord.js";
import CONSTANTS from "../common/CONSTANTS.js";
import { censor } from "../common/moderation/automod.js";

/** @type {import("../common/types/event").default<"presenceUpdate">} */
export default async function event(_, newPresence) {
	if (newPresence.guild?.id !== process.env.GUILD_ID) return;

	const activity = newPresence.activities[0];
	const member = newPresence.member;

	const censored = censor(
		(activity?.type === ActivityType.Custom ? activity?.state : activity?.name) || "",
	);
	if (
		censored &&
		CONSTANTS.roles.mod &&
		newPresence.member?.roles.resolve(CONSTANTS.roles.mod.id)
	) {
		await member?.send(
			"As a mod, you should set an example for the server, so please refrain from swears in your status. Thanks!",
		);
	}
}
