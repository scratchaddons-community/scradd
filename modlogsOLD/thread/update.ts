import { ButtonStyle, ComponentType, ThreadAutoArchiveDuration } from "discord.js";
import config from "../../../common/config.js";
import constants from "../../../common/constants.js";
import { DATABASE_THREAD } from "../../../common/database.js";
import log, { LOG_GROUPS, shouldLog } from "../logging.js";

import type Event from "../../../common/types/event";

defineEvent("threadUpdate", async (oldThread, newThread) => {
	if (newThread.guild.id !== config.guild.id) return;
	if (!shouldLog(newThread)) return;

	const logs = [];
	if (oldThread.archived !== newThread.archived)
		logs.push(` ${newThread.archived ? "closed" : "opened"}`);
	if (oldThread.locked !== newThread.locked)
		logs.push(` ${newThread.locked ? "locked" : "unlocked"}`);

	if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
		logs.push(
			`’s hide after inactivity set to ${
				{
					[ThreadAutoArchiveDuration.OneHour]: "1 Hour",
					[ThreadAutoArchiveDuration.OneDay]: "24 Hours",
					[ThreadAutoArchiveDuration.ThreeDays]: "3 Days",
					[ThreadAutoArchiveDuration.OneWeek]: "1 Week",
				}[newThread.autoArchiveDuration ?? ThreadAutoArchiveDuration.OneDay] // TODO: Is this the correct default?
			}`,
		);
	}
	if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
		logs.push(
			`’s slowmode was set to ${newThread.rateLimitPerUser} second${
				newThread.rateLimitPerUser === 1 ? "" : "s"
			}`,
		);
	}
	// TODO // newThread.appliedTags;
	if (oldThread.flags.has("Pinned") !== newThread.flags.has("Pinned")) {
		await log(
			`📌 Post ${
				newThread.flags.has("Pinned") ? "" : "un"
			}pinned in ${newThread.parent?.toString()}!`,
			"messages",
			{
				components: [
					{
						components: [
							{
								label: "View Post",
								type: ComponentType.Button,
								style: ButtonStyle.Link,
								url: newThread.url,
							},
						],

						type: ComponentType.ActionRow,
					},
				],
			},
		);
	}
	if (
		newThread.archived &&
		(((newThread.name === DATABASE_THREAD || LOG_GROUPS.includes(newThread.name)) &&
			newThread.parent?.id === config.channels.modlogs?.id) ||
			newThread.id === "1029234332977602660")
	)
		await newThread.setArchived(false, "Modlog threads must stay open");

	await Promise.all(
		logs.map(
			async (edit) =>
				await log(
					`📃 ${
						edit.startsWith(" closed") ? `#${newThread.name}` : newThread.toString()
					}${edit}!`,
					"channels",
					{
						components: [
							{
								components: [
									{
										label: "View Thread",
										type: ComponentType.Button,
										style: ButtonStyle.Link,
										url: newThread.url,
									},
								],

								type: ComponentType.ActionRow,
							},
						],
					},
				),
		),
	);
});
