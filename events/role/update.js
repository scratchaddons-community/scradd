import log from "../../common/moderation/logging.js";

/** @type {import("../../types/event").default<"roleUpdate">} */
const event = {
	async event(oldRole, newRole) {
		if (newRole.guild.id !== process.env.GUILD_ID) return;

		const logs = [];
		if (oldRole.hexColor !== newRole.hexColor) {
			logs.push(`recolored as ${newRole.hexColor}`);
		}
		if (oldRole.hoist !== newRole.hoist) {
			logs.push(`${newRole.hoist ? "" : "un"}hoisted`);
		}
		if (oldRole.managed !== newRole.managed) {
			logs.push(`made ${newRole.managed ? "" : "un"}assignable`);
		}
		if (oldRole.mentionable !== newRole.mentionable) {
			logs.push(`made ${newRole.mentionable ? "" : "non"}mentionable`);
		}
		if (oldRole.name !== newRole.name) {
			logs.push(`renamed to ${newRole.name}`);
		}
		if (oldRole.position !== newRole.position) {
			logs.push(`moved to position ${newRole.position}`);
		}
		if (
			oldRole.iconURL() !== newRole.iconURL() ||
			oldRole.unicodeEmoji !== newRole.unicodeEmoji
		) {
			logs.push(
				`icon ${
					newRole.iconURL() || newRole.unicodeEmoji
						? `set to ${
								newRole.iconURL()
									? "<" + newRole.iconURL() + ">"
									: newRole.unicodeEmoji
						  }`
						: "removed"
				}`,
			);
		}

		await Promise.all(
			logs.map((edit) =>
				log(newRole.guild, `✏ Role ${newRole.toString()} ` + edit + `!`, "server"),
			),
		);
	},
};

export default event;
