import { suggestionsDatabase, suggestionAnswers } from "../getTop.js";
import CONSTANTS from "../../../common/CONSTANTS.js";
import { shouldLog } from "../../modlogs/logging.js";

import type Event from "../../../common/types/event";

const event: Event<"threadUpdate"> = async function event(_, newThread) {
	if (newThread.guild.id !== CONSTANTS.guild.id) return;
	if (!shouldLog(newThread)) return;

	if (newThread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.data = suggestionsDatabase.data.map((suggestion) =>
			suggestion.id === newThread.id
				? {
						...suggestion,

						answer:
							CONSTANTS.channels.suggestions?.availableTags.find(
								(
									tag,
								): tag is typeof tag & { name: typeof suggestionAnswers[number] } =>
									suggestionAnswers.includes(tag.name) &&
									newThread.appliedTags.includes(tag.id),
							)?.name ?? suggestionAnswers[0],

						title: newThread.name,
				  }
				: suggestion,
		);
	}
};
export default event;
