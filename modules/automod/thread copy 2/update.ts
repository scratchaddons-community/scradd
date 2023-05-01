import CONSTANTS from "../../../common/CONSTANTS.js";
import censor, { badWordsAllowed } from "../language.js";
import { shouldLog } from "../../modlogs/logging.js";
import warn from "../../punishments/punishments.js";

import type Event from "../../../common/types/event";

const event: Event<"threadUpdate"> = async function event(oldThread, newThread) {
	if (newThread.guild.id !== CONSTANTS.guild.id) return;
	if (!shouldLog(newThread)) return;

	const censored = censor(newThread.name);
	if (censored && !badWordsAllowed(newThread)) {
		await newThread.setName(oldThread.name, "Censored bad word");
		const owner = await newThread.fetchOwner();
		if (owner?.guildMember) {
			await warn(
				owner.guildMember,
				"Watch your language!",
				censored.strikes,
				`Renamed thread to:\n${newThread.name}`,
			);
		}
	}
};
export default event;
