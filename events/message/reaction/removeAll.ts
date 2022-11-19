import { ButtonStyle, ComponentType } from "discord.js";
import log, { shouldLog } from "../../../common/logging.js";
import type Event from "../../../common/types/event";

const event: Event<"messageReactionRemoveAll"> = async function event(message, reactions) {
	if (!shouldLog(message.channel)) return;

	if (message.partial) {
		message = await message.fetch();
		return await log(
			`😳 Reactions purged on unknown message by ${message.author.toString()} in ${message.channel.toString()}!`,
			"messages",
			{
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
	}

	await log(
		`😳 Reactions purged on message by ${message.author?.toString()} in ${message.channel.toString()}!`,
		"messages",
		{
			embeds: [
				{
					fields: reactions.map((reaction) => ({
						name: reaction.emoji.toString(),
						value: reaction.count + ` reaction${reaction.count === 1 ? "" : "s"}`,
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
