import type { APIEmbed, BaseMessageOptions, Message, Snowflake } from "discord.js";

import { ApplicationCommandOptionType } from "discord.js";
import { defineChatCommand, defineEvent, zeroWidthSpace } from "strife.js";

import configEmbeds from "./config.ts";
import { getMatches, handleMatch } from "./generate.ts";

const sentEmbeds = new Map<Snowflake, Message>();
defineEvent("messageCreate", async (message) => {
	const response = await createEmbeds(message);
	if (!response) return;

	if (sentEmbeds.has(message.id))
		await sentEmbeds
			.get(message.id)
			?.edit(response)
			.catch(() => void 0);
	else if (message.system) sentEmbeds.set(message.id, await message.channel.send(response));
	else sentEmbeds.set(message.id, await message.reply(response));
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = sentEmbeds.get(message.id);
	if (!found && +"0" < 1 /* TODO: only return if there's new messages */) return;

	const data = await createEmbeds(message);
	if (found)
		await found.edit(
			data ?? { content: zeroWidthSpace, components: [], embeds: [], files: [] },
		);
	else if (data && message.channel.isSendable())
		sentEmbeds.set(
			message.id,
			await (message.system ? message.channel.send(data) : message.reply(data)),
		);
});

async function createEmbeds(message: Message): Promise<BaseMessageOptions | undefined> {
	const matches = getMatches(message.content);
	const embeds: APIEmbed[] = [];
	for (const match of matches) {
		const embed = await handleMatch(match);
		if (embed) embeds.push(embed);
		if (embeds.length >= 5) break;
	}
	if (embeds.length) return { content: "", files: [], embeds };
}

defineEvent("messageDelete", async (message) => {
	const found = sentEmbeds.get(message.id);
	if (found?.deletable) await found.delete().catch(() => void 0);

	const reference =
		found?.id ?? [...sentEmbeds.entries()].find(([, { id }]) => id === message.id)?.[0];
	if (reference) sentEmbeds.delete(reference);
	sentEmbeds.delete(message.id);
});

defineChatCommand(
	{
		name: "scratch-embeds",
		description: "Toggle embedding links to Scratch projects in this channel or server",
		access: false,
		restricted: true,
		options: {
			setting: {
				description: "The setting to set (omit to view settings)",
				type: ApplicationCommandOptionType.String,
				choices: {
					"server": "Toggle whole server",
					"on-channel": "On in this channel",
					"off-channel": "Off in this channel",
				},
				required: false,
			},
		},
	} as const,
	// @ts-expect-error -- Strife bug
	configEmbeds,
);
