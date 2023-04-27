import { ButtonStyle, ComponentType } from "discord.js";

import log, { shouldLog } from "./logging.js";

import type Event from "../../common/types/event";

const event: Event<"messageReactionRemoveAll"> = async function event(partialMessage, reactions) {
	const message = partialMessage.partial ? await partialMessage.fetch() : partialMessage;

	if (!shouldLog(message.channel)) return;

	await log(
		`😳 Reactions purged on message by ${message.author.toString()} in ${message.channel.toString()}!`,
		"messages",
		{
			embeds: [
				{
					fields: reactions.map((reaction) => ({
						name: reaction.emoji.toString(),
						value: `${reaction.count} reaction${reaction.count === 1 ? "" : "s"}`,
						inline: true,
					})),
				},
			],

			components: [
				{
					type: ComponentType.ActionRow,

					components: [
						{
							label: "View Context",
							style: ButtonStyle.Link,
							type: ComponentType.Button,
							url: message.url,
						},
					],
				},
			],
		},
	);
};

export default event;
