import client from "../../../client.js";
import { suggestionAnswers, suggestionsDatabase } from "../getTop.js";
import CONSTANTS from "../../../common/CONSTANTS.js";

import type Event from "../../../common/types/event";

defineEvent("threadCreate", async (thread, newlyCreated) => {
	if (thread.guild.id !== CONSTANTS.guild.id || !newlyCreated) return;

	if (thread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.data = [
			...suggestionsDatabase.data,
			{
				answer: suggestionAnswers[0],
				author: thread.ownerId ?? client.user.id,
				count: 0,
				id: thread.id,
				title: thread.name,
			},
		];
	}
});
