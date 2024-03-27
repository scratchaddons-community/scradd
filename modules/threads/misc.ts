import type { AnyThreadChannel, Snowflake } from "discord.js";
import config from "../../common/config.js";
import Database from "../../common/database.js";

export const threadsDatabase = new Database<{
	id: Snowflake;
	roles: string | null;
	keepOpen: boolean;
}>("threads");
await threadsDatabase.init();

export function getThreadConfig(thread: AnyThreadChannel): { roles: string[]; keepOpen: boolean } {
	const found = threadsDatabase.data.find((found) => found.id === thread.id);
	if (found) return { keepOpen: found.keepOpen, roles: found.roles?.split("|") ?? [] };

	return (
		{
			[config.channels.servers?.id || ""]: { roles: [], keepOpen: true },
			[config.channels.mod.id || ""]: { roles: [config.roles.staff.id], keepOpen: false },
			[config.channels.modlogs.id || ""]: { roles: [config.roles.mod.id], keepOpen: true },
			[config.channels.exec?.id || ""]: { roles: [config.roles.exec.id], keepOpen: false },
			[config.channels.admin.id || ""]: { roles: [config.roles.staff.id], keepOpen: false },
		}[thread.parent?.id || ""] ?? { roles: [], keepOpen: false }
	);
}
