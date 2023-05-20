import type { PresenceStatus } from "discord.js";
import config from "../common/config.js";
import Database from "../common/database.js";
import defineEvent from "../lib/events.js";

export const statusDatabase = new Database<
	{ [status in PresenceStatus]: number } & { time: number; unknown: number }
>("mod_statuses");
await statusDatabase.init();

const members = await config.guild.members.fetch({ withPresences: true });
const presenses = members
	.filter((member) => member.roles.resolve(config.roles.mod?.id ?? ""))
	.mapValues((mod) => mod.presence?.status ?? "unknown");
updateDatabase();

defineEvent("presenceUpdate", (_, presense) => {
	if (!presense.member || !presense.member.roles.resolve(config.roles.mod?.id ?? "")) return;
	presenses.set(presense.member.id, presense.status);
	updateDatabase();
});

function updateDatabase() {
	statusDatabase.data = [
		...statusDatabase.data,
		{
			time: Date.now(),
			dnd: presenses.filter((presense) => presense === "dnd").size,
			idle: presenses.filter((presense) => presense === "idle").size,
			invisible: presenses.filter((presense) => presense === "invisible").size,
			offline: presenses.filter((presense) => presense === "offline").size,
			online: presenses.filter((presense) => presense === "online").size,
			unknown: presenses.filter((presense) => presense === "unknown").size,
		},
	];
}
