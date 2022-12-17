import { automodMessage } from "../../common/automod.js";
import log, { getLoggingThread, shouldLog } from "../../common/logging.js";
import { getMessageJSON } from "../../util/discord.js";
import jsonDiff from "json-diff";
import { ButtonStyle, ComponentType } from "discord.js";
import diffLib from "difflib";
import CONSTANTS from "../../common/CONSTANTS.js";
import client from "../../client.js";
import type Event from "../../common/types/event";
import { DATABASE_THREAD } from "../../common/database.js";
const databaseThread = await getLoggingThread(DATABASE_THREAD);

const event: Event<"messageUpdate"> = async function event(oldMessage, newMessage) {
	if (newMessage.partial) newMessage = await newMessage.fetch();
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
		log(
			`🗄 Embeds ${
				newMessage.flags.has("SuppressEmbeds") ? "removed" : "shown"
			} on message by ${newMessage.author.toString()} in ${newMessage.channel.toString()}` +
				"!",
			"messages",
			{
				embeds: oldMessage.embeds,
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
			},
		);
	}
	if (
		oldMessage.pinned !== null &&
		(newMessage.author.id === client.user.id) !==
			(newMessage.channel.id === CONSTANTS.channels.board?.id) &&
		oldMessage.pinned !== newMessage.pinned
	) {
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
		const contentDiff =
			oldMessage.content !== null &&
			diffLib
				.unifiedDiff((oldMessage.content ?? "").split("\n"), newMessage.content.split("\n"))
				.join("\n");

		const extraDiff = jsonDiff.diffString(
			{ ...getMessageJSON(oldMessage), content: undefined, embeds: undefined },
			{ ...getMessageJSON(newMessage), content: undefined, embeds: undefined },
			{ color: false },
		);

		if (contentDiff)
			files.push({
				attachment: Buffer.from(
					contentDiff.replace(/^--- \n{2}\+\+\+ \n{2}@@ .+ @@\n{2}/, ""),
					"utf-8",
				),
				name: "content.diff",
			});

		if (extraDiff)
			files.push({ attachment: Buffer.from(extraDiff, "utf-8"), name: "extra.diff" });

		if (files.length)
			log(
				`✏ Message by ${newMessage.author.toString()} in ${newMessage.channel.toString()} edited (ID: ${
					newMessage.id
				})!`,
				"messages",
				{
					files,
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
				},
			);
	}

	await Promise.all(
		logs.map((edit) =>
			log(edit + "!", "messages", {
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
	if (await automodMessage(newMessage)) return;
};

export default event;
