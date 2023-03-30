import { unifiedDiff } from "difflib";
import { ButtonStyle, ComponentType } from "discord.js";
import { diffString } from "json-diff";

import automodMessage from "../../common/automod.js";
import { DATABASE_THREAD } from "../../common/database.js";
import log, { getLoggingThread, shouldLog } from "../../common/logging.js";
import { getMessageJSON } from "../../util/discord.js";

import type Event from "../../common/types/event";

const databaseThread = await getLoggingThread(DATABASE_THREAD);

const event: Event<"messageUpdate"> = async function event(oldMessage, partialMessage) {
	const newMessage = partialMessage.partial ? await partialMessage.fetch() : partialMessage;
	if (!shouldLog(newMessage.channel)) return;
	const logs = [];
	if (oldMessage.flags.has("Crossposted") !== newMessage.flags.has("Crossposted")) {
		logs.push(
			`📢 Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.flags.has("Crossposted") ? "" : "un"
			}published`,
		);
	}
	if (oldMessage.flags.has("SuppressEmbeds") !== newMessage.flags.has("SuppressEmbeds")) {
		await log(
			`🗄 Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed" : "shown"
			} on message by ${newMessage.author.toString()} in ${newMessage.channel.toString()}` +
				"!",
			"messages",
			{
				components: [
					{
						components: [
							{
								label: "View Message",
								type: ComponentType.Button,
								style: ButtonStyle.Link,
								url: newMessage.url,
							},
						],

						type: ComponentType.ActionRow,
					},
				],

				embeds: oldMessage.embeds,
			},
		);
	}

	if (oldMessage.pinned !== null && oldMessage.pinned !== newMessage.pinned) {
		logs.push(
			`📌 Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} ${
				newMessage.pinned ? "" : "un"
			}pinned`,
		);
	}
	if (
		!oldMessage.partial &&
		databaseThread.id !== newMessage.channel.id &&
		!newMessage.author.bot
	) {
		const files = [];
		const contentDiff = unifiedDiff(
			oldMessage.content.split("\n"),
			newMessage.content.split("\n"),
		).join("\n");

		const extraDiff = diffString(
			{ ...getMessageJSON(oldMessage), content: undefined, embeds: undefined },
			{ ...getMessageJSON(newMessage), content: undefined, embeds: undefined },
			{ color: false },
		);

		if (contentDiff) {
			files.push({
				attachment: Buffer.from(
					contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
					"utf8",
				),

				name: "content.diff",
			});
		}

		if (extraDiff)
			files.push({ attachment: Buffer.from(extraDiff, "utf8"), name: "extra.diff" });

		if (files.length > 0) {
			await log(
				`✏️ Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited (ID: ${
					newMessage.id
				})!`,
				"messages",
				{
					components: [
						{
							components: [
								{
									label: "View Message",
									type: ComponentType.Button,
									style: ButtonStyle.Link,
									url: newMessage.url,
								},
							],

							type: ComponentType.ActionRow,
						},
					],

					files,
				},
			);
		}
	}

	await Promise.all(
		logs.map(
			async (edit) =>
				await log(`${edit}!`, "messages", {
					components: [
						{
							type: ComponentType.ActionRow,

							components: [
								{
									type: ComponentType.Button,
									label: "View Message",
									style: ButtonStyle.Link,
									url: newMessage.url,
								},
							],
						},
					],
				}),
		),
	);

	await automodMessage(newMessage);
};

export default event;
