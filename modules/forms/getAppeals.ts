import { client } from "strife.js";
import config, { getInitialChannelThreads } from "../../common/config.js";
import { getAllMessages } from "../../util/discord.js";

if (!config.channels.mod) throw new ReferenceError("Could not find mod channel");
export const thread =
	getInitialChannelThreads(config.channels.mod).find(
		(thread) => thread.name === "Ban Appeal Forms",
	) ||
	(await config.channels.mod.threads.create({
		name: "Ban Appeal Forms",
		reason: "For ban appeal forms",
	}));
export default Object.fromEntries(
	(await getAllMessages(thread))
		.filter((message) => message.author.id === client.user.id && message.embeds.length)
		.map((message) => {
			const decision = message.embeds[1]?.title;
			return [
				message.embeds[0]?.description ?? "",
				{
					unbanned: decision === "Accepted",
					note: message.embeds[1]?.fields.find(
						(field) => field.name == `${decision} Note`,
					)?.value,
					date: new Date(message.createdTimestamp + 691_200_000).toDateString(),
				},
			];
		}),
);
