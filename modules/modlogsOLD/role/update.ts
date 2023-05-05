import CONSTANTS from "../../../common/CONSTANTS.js";
import log from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("roleUpdate", async (oldRole, newRole) => {
	if (newRole.guild.id !== CONSTANTS.guild.id) return;

	const logs = [];
	if (oldRole.hexColor !== newRole.hexColor)
		logs.push(`’s role color set to ${newRole.hexColor}`);

	if (oldRole.hoist !== newRole.hoist) {
		logs.push(
			` set to display role members ${
				newRole.hoist ? "separately from" : "combined with"
			} online members`,
		);
	}
	if (oldRole.managed !== newRole.managed)
		logs.push(` made ${newRole.managed ? "" : "un"}assignable`);

	if (oldRole.mentionable !== newRole.mentionable)
		logs.push(` set to ${newRole.mentionable ? "" : "dis"}allow anyone to @mention this role`);

	if (oldRole.name !== newRole.name) logs.push(` renamed to ${newRole.name}`);

	if (oldRole.position !== newRole.position) logs.push(` moved to position ${newRole.position}`);

	if (oldRole.iconURL() !== newRole.iconURL() || oldRole.unicodeEmoji !== newRole.unicodeEmoji) {
		const iconURL = newRole.iconURL({ size: 128 });
		const response = iconURL && (await fetch(iconURL));
		await log(
			`✏️ Role ${newRole.toString()}’s icon was ${
				response
					? "changed"
					: newRole.unicodeEmoji
					? `set to ${newRole.unicodeEmoji}`
					: "removed"
			}!`,
			"server",
			{ files: response ? [Buffer.from(await response.arrayBuffer())] : [] },
		);
	}

	await Promise.all(
		logs.map(async (edit) => await log(`✏️ Role ${newRole.toString()}${edit}!`, "server")),
	);
});
