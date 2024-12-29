import type { APIEmbed, BaseMessageOptions, Message, Snowflake } from "discord.js";

import { setTimeout as wait } from "node:timers/promises";

import { ApplicationCommandType, ButtonStyle, ComponentType, MessageType } from "discord.js";
import {
	defineButton,
	defineEvent,
	defineMenuCommand,
	getBaseChannel,
	zeroWidthSpace,
} from "strife.js";

import config from "../../common/config.ts";
import { BOARD_EMOJI } from "../board/misc.ts";
import { getSettings } from "../settings.ts";
import scraddChat, { allowChat, chatName, denyChat, learn, removeResponse } from "./chat.ts";
import { getMatches, handleMatch } from "./scratch.ts";

const ignoredChannels = new Set<Snowflake>();
defineEvent("messageCreate", async (message) => {
	await learn(message);

	if (
		[
			MessageType.GuildBoost,
			MessageType.GuildBoostTier1,
			MessageType.GuildBoostTier2,
			MessageType.GuildBoostTier3,
		].includes(message.type)
	)
		await message.react(BOARD_EMOJI).catch(() => void 0);

	const response = await handleMutatable(message);
	if (!response) return;

	if (response.delay) {
		if (ignoredChannels.has(message.channel.id)) return;
		await message.channel.sendTyping();
		await wait(response.delay);
		ignoredChannels.delete(message.channel.id);
	}
	if (autoResponses.has(message.id))
		await autoResponses
			.get(message.id)
			?.edit(response.data)
			.catch(() => void 0);
	else {
		const reply = await (message.system ?
			message.channel.send(response.data)
		:	message.reply(response.data));
		autoResponses.set(message.id, reply);
	}
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = autoResponses.get(message.id);
	if (!found && +"0" < 1 /* TODO: only return if there's new messages */) return;

	const { data } = (await handleMutatable(message)) ?? {};
	if (found)
		await found.edit(
			data ?? { content: zeroWidthSpace, components: [], embeds: [], files: [] },
		);
	else if (data && message.channel.isSendable())
		autoResponses.set(
			message.id,
			await (message.system ? message.channel.send(data) : message.reply(data)),
		);
});

async function handleMutatable(
	message: Message,
): Promise<{ data: BaseMessageOptions; delay?: number } | undefined> {
	if (getBaseChannel(message.channel)?.id === config.channels.modlogs.id) return;

	const settings = await getSettings(message.author);
	const configuredSettings = await getSettings(message.author, false);

	if (settings.scratchEmbeds) {
		const matches = getMatches(message.content);
		const embeds: APIEmbed[] = [];
		for (const match of matches) {
			const embed = await handleMatch(match);
			if (embed) {
				embeds.push(embed);
				if (configuredSettings.scratchEmbeds !== undefined)
					embed.footer = { text: "Disable this using /settings" };
			}
			if (embeds.length >= 5) break;
		}
		if (embeds.length)
			return {
				data: {
					content: "",
					files: [],
					embeds,
					components:
						configuredSettings.scratchEmbeds === undefined ?
							[
								{
									components: [
										{
											customId: `scratchEmbeds-${message.author.id}_toggleSetting`,
											type: ComponentType.Button as const,
											label: "Disable Scratch Embeds",
											style: ButtonStyle.Success as const,
										},
									],
									type: ComponentType.ActionRow,
								},
							]
						:	[],
				},
			};
	}

	const chatResponse = scraddChat(message);
	if (chatResponse)
		return {
			delay: Math.random() * Math.random() * 9750,
			data: { content: chatResponse, files: [], embeds: [], components: [] },
		};
}

defineEvent("messageDelete", async (message) => {
	const found = autoResponses.get(message.id);
	if (found?.deletable) await found.delete();

	const reference =
		found?.id ?? [...autoResponses.entries()].find(([, { id }]) => id === message.id)?.[0];
	if (reference) autoResponses.delete(reference);
});

const autoResponses = new Map<Snowflake, Message>();

defineButton("allowChat", allowChat);
defineButton("denyChat", denyChat);
defineMenuCommand(
	{ name: `Remove ${chatName} Response`, type: ApplicationCommandType.Message, restricted: true },
	removeResponse,
);
