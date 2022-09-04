import log from "../../common/moderation/logging.js";

/** @type {import("../../common/types/event").default<"roleUpdate">} */
export default async function event(oldRole, newRole) {
	if (newRole.guild.id !== process.env.GUILD_ID) return;

	const logs = [];
	if (oldRole.hexColor !== newRole.hexColor) {
		logs.push(`’s role color set to ${newRole.hexColor}`);
	}
	if (oldRole.hoist !== newRole.hoist) {
		logs.push(
			` set to display role members ${
				newRole.hoist ? "separately from" : "combined with"
			} online members`,
		);
	}
	if (oldRole.managed !== newRole.managed) {
		logs.push(` made ${newRole.managed ? "" : "un"}assignable`);
	}
	if (oldRole.mentionable !== newRole.mentionable) {
		logs.push(` set to ${newRole.mentionable ? "" : "dis"}allow anyone to @mention this role`);
	}
	if (oldRole.name !== newRole.name) {
		logs.push(`renamed to ${newRole.name}`);
	}
	if (oldRole.position !== newRole.position) {
		logs.push(`moved to position ${newRole.position}`);
	}
	if (oldRole.iconURL() !== newRole.iconURL() || oldRole.unicodeEmoji !== newRole.unicodeEmoji) {
		logs.push(
			`icon ${
				newRole.iconURL() || newRole.unicodeEmoji
					? `set to ${
							newRole.iconURL() ? "<" + newRole.iconURL() + ">" : newRole.unicodeEmoji
					  }`
					: "removed"
			}`,
		);
	}

	await Promise.all(
		logs.map((edit) => log(`✏ Role ${newRole.toString()}` + edit + `!`, "server")),
	);
}
