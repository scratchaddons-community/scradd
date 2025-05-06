import type { APIEmbed, BaseMessageOptions, Message, Snowflake } from "discord.js";

import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { defineChatCommand, defineEvent, zeroWidthSpace } from "strife.js";

import { assertSendable } from "../../util/discord.ts";
import configEmbeds, { EmbedConfig } from "./config.ts";
import { getMatches, handleMatch } from "./generate.ts";

const sentEmbeds = new Map<Snowflake, Message>();
defineEvent("messageCreate", async (message) => {
	if (!assertSendable(message.channel, PermissionFlagsBits.EmbedLinks)) return;

	const config =
		message.guild ?
			await EmbedConfig.findOne({ guild: message.guild.id }).exec()
		:	{ enabled: true, channels: undefined };
	if (config && (!config.enabled || config.channels?.get(message.channel.id) === false)) return;

	const response = await createEmbeds(message);
	if (!response) return;

	if (message.system) sentEmbeds.set(message.id, await message.channel.send(response));
	else sentEmbeds.set(message.id, await message.reply(response));
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = sentEmbeds.get(message.id);
	if (!found && +"0" < 1 /* TODO: only return if there's new messages */) return;

	const response = await createEmbeds(message);
	if (found)
		await found.edit(
			response ?? { content: zeroWidthSpace, components: [], embeds: [], files: [] },
		);
	else if (response) {
		const channel = assertSendable(message.channel, PermissionFlagsBits.EmbedLinks);
		if (!channel) return;

		const config =
			message.guild ?
				await EmbedConfig.findOne({ guild: message.guild.id }).exec()
			:	{ enabled: true, channels: undefined };
		if (config && (!config.enabled || config.channels?.get(channel.id) === false)) return;

		if (message.system) sentEmbeds.set(message.id, await channel.send(response));
		else sentEmbeds.set(message.id, await message.reply(response));
	}
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
