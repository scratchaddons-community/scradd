import {
	MessageType,
	type PartialMessage,
	type Message,
	type Snowflake,
	type APIEmbed,
} from "discord.js";
import { getSettings } from "../settings.js";
import { BOARD_EMOJI } from "../board/misc.js";
import { client, defineEvent } from "strife.js";
import { getMatches, handleMatch } from "./scratch.js";

defineEvent("messageCreate", async (message) => {
	if (message.author.bot) {
		return;
	}
	let reactions = 0;

	if (
		[
			MessageType.GuildBoost,
			MessageType.GuildBoostTier1,
			MessageType.GuildBoostTier2,
			MessageType.GuildBoostTier3,
		].includes(message.type)
	) {
		await message.react(BOARD_EMOJI).catch(() => void 0);
		reactions++;
	}

	const settings = await getSettings(message.author);
	if (settings.scratchEmbeds) {
		const notSet = (await getSettings(message.author, false)).scratchEmbeds === undefined;

		const matches = getMatches(message.content);
		const embeds: APIEmbed[] = [];
		for (const match of matches) {
			const embed = await handleMatch(match);
			if (embed) {
				embeds.push(embed);
				if (notSet) embed.footer = { text: "Disable this using /settings" };
			}
		}
		if (embeds.length)
			if (embeds) {
				message.reply({ content: "", embeds: embeds });
				return;
			}
	}
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = await getAutoResponse(message);
	if (found === false) return;
	const settings = await getSettings(message.author);
	if (settings.scratchEmbeds) {
		const notSet = (await getSettings(message.author, false)).scratchEmbeds === undefined;

		const matches = getMatches(message.content);
		const embeds: APIEmbed[] = [];
		for (const match of matches) {
			const embed = await handleMatch(match);
			if (embed) {
				embeds.push(embed);
				if (notSet) embed.footer = { text: "Disable this using /settings" };
			}
		}
		if (embeds.length)
			if (found) await found.edit({ embeds: embeds });
			else await message.reply({ embeds: embeds });
	}
});

defineEvent("messageDelete", async (message) => {
	const found = await getAutoResponse(message);
	if (!found) return;

	await found.delete();
	autoResponses.delete(found.id);
});

const autoResponses = new Map<Snowflake, Message>();
async function getAutoResponse(message: Message | PartialMessage) {
	const cached = autoResponses.get(message.id);
	if (cached) return cached;

	const fetched = await message.channel.messages.fetch({ limit: 2, after: message.id });
	const found = fetched.find(
		(found) =>
			found.reference?.messageId === message.id &&
			found.author.id === client.user.id &&
			found.createdTimestamp - message.createdTimestamp < 1000,
	);

	if (found) autoResponses.set(message.id, found);
	if (fetched.size && !found) return false;
	return found;
}
