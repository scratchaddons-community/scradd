import { ButtonStyle, ComponentType, ThreadAutoArchiveDuration } from "discord.js";

import { suggestionsDatabase, suggestionAnswers } from "../../commands/get-top-suggestions.js";
import censor, { badWordsAllowed } from "../../common/language.js";
import CONSTANTS from "../../common/CONSTANTS.js";
import { DATABASE_THREAD } from "../../common/database.js";
import log, { LOG_GROUPS, shouldLog } from "../../common/logging.js";
import {
	MODMAIL_COLORS,
	getUserFromModmail,
	sendClosedMessage,
	sendOpenedMessage,
} from "../../common/modmail.js";
import warn from "../../common/punishments.js";

import type Event from "../../common/types/event";

const event: Event<"threadUpdate"> = async function event(oldThread, newThread) {
	if (newThread.guild.id !== CONSTANTS.guild.id) return;
	if (!shouldLog(newThread)) return;

	if (newThread.parent?.id === CONSTANTS.channels.suggestions?.id) {
		suggestionsDatabase.data = suggestionsDatabase.data.map((suggestion) =>
			suggestion.id === newThread.id
				? {
						...suggestion,

						answer:
							CONSTANTS.channels.suggestions?.availableTags.find(
								(
									tag,
								): tag is typeof tag & { name: typeof suggestionAnswers[number] } =>
									suggestionAnswers.includes(tag.name) &&
									newThread.appliedTags.includes(tag.id),
							)?.name ?? suggestionAnswers[0],

						title: newThread.name,
				  }
				: suggestion,
		);
	}

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
				}[newThread.autoArchiveDuration ?? ThreadAutoArchiveDuration.OneDay] ??
				newThread.autoArchiveDuration
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
			newThread.parent?.id === CONSTANTS.channels.modlogs?.id) ||
			newThread.id === "1029234332977602660")
	)
		await newThread.setArchived(false, "Modlog threads must stay open");

	await Promise.all(
		logs.map(
			async (edit) =>
				await log(`📃 Thread #${newThread.name}${edit}!`, "channels", {
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
				}),
		),
	);
	const censored = censor(newThread.name);
	if (censored && !badWordsAllowed(newThread)) {
		await newThread.setName(oldThread.name, "Censored bad word");
		const owner = await newThread.fetchOwner();
		if (owner?.guildMember) {
			await warn(
				owner.guildMember,
				"Watch your language!",
				censored.strikes,
				`Renamed thread to:\n${newThread.name}`,
			);
		}
	}

	const latestMessage = (await oldThread.messages.fetch({ limit: 1 })).first();
	if (
		newThread.parent?.id !== CONSTANTS.channels.modmail?.id ||
		oldThread.archived === newThread.archived ||
		(newThread.archived &&
			latestMessage?.interaction?.commandName === "modmail close" &&
			Date.now() - Number(latestMessage.createdAt) < 60_000)
	)
		return;

	if (newThread.archived) {
		await sendClosedMessage(newThread);
		return;
	}
	const member = await getUserFromModmail(newThread);

	await Promise.all([
		newThread.fetchStarterMessage().then((starter) => {
			starter
				?.edit({
					embeds: [
						{
							...starter.embeds[0]?.data,
							color: MODMAIL_COLORS.opened,
							title: "Modmail ticket opened!",
						},
					],
				})
				.catch(console.error);
		}),
		member && sendOpenedMessage(member),
	]);
};
export default event;
