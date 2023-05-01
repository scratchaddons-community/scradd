import logError from "../../util/logError.js";
import defineEvent from "../../events.js";

defineEvent("invalidated", async () => {
	await logError(new ReferenceError("Session is invalid"), "invalidated");
	process.exit(1);
});
defineEvent("guildUnavailable", async (guild) => {
	throw new ReferenceError(`Guild ${guild.name} (${guild.id}) unavailable`);
});
