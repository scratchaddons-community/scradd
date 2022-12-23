import { ActivityType } from "discord.js";

import { censor } from "../common/automod.js";
import CONSTANTS from "../common/CONSTANTS.js";

import type Event from "../common/types/event";

const event: Event<"presenceUpdate"> = async function event(_, newPresence) {
	if (newPresence.guild?.id !== CONSTANTS.guild.id) return;

	const [activity] = newPresence.activities;
	const { member } = newPresence;

	const censored = censor(
		(activity?.type === ActivityType.Custom ? activity.state : activity?.name) ?? "",
	);
	if (censored && CONSTANTS.roles.mod && member?.roles.resolve(CONSTANTS.roles.mod.id)) {
		await member?.send(
			"⚠ As a mod, you should set an example for the server, so please refrain from swears in your status. Thanks!",
		);
	}
};
export default event;
