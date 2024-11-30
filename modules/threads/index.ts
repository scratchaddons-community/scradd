import { ChannelType, roleMention } from "discord.js";
import { defineButton, defineEvent } from "strife.js";

import { autoClose, cancelThreadChange } from "./auto-close.ts";
import { getThreadConfig, threadsDatabase } from "./misc.ts";
import { updateMemberThreads, updateThreadMembers } from "./sync-members.ts";

defineEvent("threadCreate", async (thread) => {
	if (thread.type === ChannelType.PrivateThread) return;
	const threadConfig = getThreadConfig(thread);
	if (threadConfig.roles.length)
		await thread.send({
			content: threadConfig.roles.map(roleMention).join(""),
			allowedMentions: { parse: ["roles"] },
		});

	threadsDatabase.updateById(
		{ id: thread.id, keepOpen: threadConfig.keepOpen },
		{ roles: threadConfig.roles.join("|") },
	);
});

defineButton("cancelThreadChange", cancelThreadChange);
defineEvent("threadUpdate", autoClose);

defineEvent("guildMemberUpdate", updateMemberThreads);
defineEvent("threadUpdate", updateThreadMembers);
