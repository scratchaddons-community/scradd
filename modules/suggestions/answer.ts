import {
	AuditLogEvent,
	Colors,
	ForumChannel,
	ThreadChannel,
	type GuildAuditLogsEntry,
	type Snowflake,
} from "discord.js";
import config from "../../common/config.js";
import { formatAnyEmoji } from "strife.js";
import { lerpColors } from "../../util/numbers.js";
import type { AuditLog } from "../logging/util.js";
import { parseSuggestionTags, suggestionAnswers } from "./misc.js";

export default async function answerSuggestion(rawEntry: GuildAuditLogsEntry): Promise<void> {
	if (rawEntry.action !== AuditLogEvent.ThreadUpdate) return;
	const entry = rawEntry as AuditLog<AuditLogEvent.ThreadUpdate, "applied_tags">;

	if (!(entry.target instanceof ThreadChannel)) return;
	const channel = entry.target.parent;
	if (
		!(channel instanceof ForumChannel) ||
		![config.channels.suggestions?.id, config.channels.bugs?.id].includes(channel.id)
	)
		return;

	const changes = entry.changes.filter(
		(change): change is { key: "applied_tags"; old: Snowflake[]; new: Snowflake[] } =>
			change.key === "applied_tags",
	);
	if (!changes.length) return;

	const oldAnswer = parseSuggestionTags(
		changes[0]?.old ?? [],
		channel.availableTags,
		channel.id === config.channels.bugs?.id ? undefined : suggestionAnswers[0],
	).answer;
	const newAnswer = parseSuggestionTags(
		changes.at(-1)?.new ?? [],
		channel.availableTags,
		channel.id === config.channels.bugs?.id ? undefined : suggestionAnswers[0],
	).answer;
	if (oldAnswer.name === newAnswer.name) return;

	const user =
		entry.executor &&
		(await config.guild.members.fetch(entry.executor.id).catch(() => entry.executor));

	const emoji = formatAnyEmoji(newAnswer.emoji);
	await entry.target.send({
		embeds: [
			{
				author:
					user ?
						{
							icon_url: user.displayAvatarURL(),
							name: "Answered by " + user.displayName,
						}
					:	undefined,
				color:
					newAnswer.position < 0 ?
						undefined
					:	lerpColors(
							[Colors.Green, Colors.Blue, Colors.Yellow, Colors.Red],
							newAnswer.position,
						),
				title: `${emoji ? `${emoji} ` : ""}${newAnswer.name}`,
				description: channel.topic?.split(`\n- **${newAnswer.name}**: `)[1]?.split("\n")[0],
				footer: { text: `Was previously ${oldAnswer.name}` },
			},
		],
	});
}
