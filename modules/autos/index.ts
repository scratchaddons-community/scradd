import type { APIEmbed, BaseMessageOptions, Message, Snowflake } from "discord.js";

import { setTimeout as wait } from "node:timers/promises";

import {
	ApplicationCommandType,
	ButtonStyle,
	ChannelType,
	ComponentType,
	MessageType,
} from "discord.js";
import {
	client,
	defineButton,
	defineEvent,
	defineMenuCommand,
	getBaseChannel,
	stripMarkdown,
	zeroWidthSpace,
} from "strife.js";

import config from "../../common/config.ts";
import { GlobalMentionsPattern } from "../../util/discord.ts";
import { normalize } from "../../util/text.ts";
import { BOARD_EMOJI } from "../board/misc.ts";
import { getSettings } from "../settings.ts";
import scraddChat, { allowChat, chatName, denyChat, learn, removeResponse } from "./chat.ts";
import dad from "./dad.ts";
import { getMatches, handleMatch } from "./scratch.ts";

const ignoreTriggers = [
	/\babus/i,
	/\bbleed/i,
	/\bdepress/i,
	/\bkill/i,
	/\bkms/i,
	/\bkys/i,
	/\bpain/i,
	/\bsick/i,
	/\bsuicid/i,
	/\bunaliv/i,
];

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
	if (response === true) return;
	for (const [index, action] of [response].flat().entries()) {
		if (!action) break;

		if (typeof action === "number") {
			if (index === 0)
				if (ignoredChannels.has(message.channel.id)) break;
				else ignoredChannels.add(message.channel.id);

			await message.channel.sendTyping();
			await wait(action);
			if (index === 0) ignoredChannels.delete(message.channel.id);
			continue;
		}

		if (!autoResponses.has(message.id)) {
			const reply = await (message.system ?
				message.channel.send(action)
			:	message.reply(action));
			autoResponses.set(message.id, reply);
			continue;
		}

		const reply = await autoResponses
			.get(message.id)
			?.edit(action)
			.catch(() => void 0);
		if (!reply) break;
	}
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = autoResponses.get(message.id);
	if (!found && +"0" < 1 /* TODO: only return if there's new messages */) return;

	const response = await handleMutatable(message);
	const data =
		Array.isArray(response) ?
			response.find((item) => typeof item === "object")
		:	typeof response === "object" && response;
	if (found)
		await found.edit(
			data || { content: zeroWidthSpace, components: [], embeds: [], files: [] },
		);
	else if (data && message.channel.isSendable())
		autoResponses.set(
			message.id,
			await (message.system ? message.channel.send(data) : message.reply(data)),
		);
});

async function handleMutatable(
	message: Message,
): Promise<(BaseMessageOptions | number)[] | BaseMessageOptions | true | undefined> {
	const baseChannel = getBaseChannel(message.channel);
	if (config.channels.modlogs.id === baseChannel?.id) return;

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
			};
	}

	const ignored = ignoreTriggers.some((trigger) => message.content.match(trigger));
	if (ignored) return true;

	const chatResponse = scraddChat(message);
	if (chatResponse)
		return [
			Math.random() * Math.random() * 9750,
			{ content: chatResponse, files: [], embeds: [], components: [] },
		];

	if (!canDoSecrets(message, true)) return;
	const content = stripMarkdown(normalize(message.content).replaceAll(GlobalMentionsPattern, ""))
		.toLowerCase()
		.trim();
	if (/^i(?:[\S\W]| a)?m\b/u.test(content)) {
		const name = content
			.split(
				/[\p{Ps}\p{Pe}\p{Pi}\p{Pf}𞥞𞥟𑜽،܀۔؛⁌᭟＂‽՜؟𑜼՝𑿿։꛴⁍፨"⸘‼՞᨟꛵꛳꛶•⸐!꛷𑅀,𖫵:⁃჻⁉𑅃፠⹉᙮𒑲‣⸏！⳺𐡗፣⳾𒑴⹍¡⳻𑂿，⳹𒑳᥄⁇𑂾､𛲟𒑱⸑𖺚፧𑽆、።፥𑇈⹓？𑽅꓾.፦𑗅߹;𑈼𖺗．፤𑗄︕¿𑈻⹌｡：𝪋⁈᥅𑅵᠂。；⵰﹗⹔𑻸᠈꓿᠄︖𑊩𑑍𖺘︓?၊𑑚᠃︔⸮။߸᠉⁏﹖𐮙︐︒;꘏𐮚︑𝪈𝪊꥟⸴﹒𝪉§⹁⸼﹕𑇞𝪇܂﹔𑇟﹐܁܆𑗏﹑꘎܇𑗐⸲܅𑗗꘍܄𑗕܉𑗖܃𑗑܈𑗓⁝𑗌⸵𑗍𑗎𑗔𑗋𑗊𑗒⸹؝𑥆𑗉…᠁︙․‥\n]+/gmu,
			)[0]
			.split(/\s+/g)
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		if (name && message.member)
			return [dad(name, message.member)].flat().map((item) =>
				typeof item === "string" ?
					{
						content: item,
						files: [],
						embeds: [],
						components: [],
						allowedMentions: { users: [], repliedUser: true },
					}
				:	item,
			);
	}
}

defineEvent("messageDelete", async (message) => {
	const found = autoResponses.get(message.id);
	if (found?.deletable) await found.delete();

	const reference =
		found?.id ?? [...autoResponses.entries()].find(([, { id }]) => id === message.id)?.[0];
	if (reference) autoResponses.delete(reference);
});

const autoResponses = new Map<Snowflake, Message>();

function canDoSecrets(message: Message, checkDads = false): boolean {
	if (message.channel.isDMBased()) return false;
	if (
		message.mentions.has(client.user, {
			ignoreEveryone: true,
			ignoreRepliedUser: true,
			ignoreRoles: true,
		})
	)
		return true;

	if (checkDads) {
		const baseChannel = getBaseChannel(message.channel);
		if (
			(message.guild?.id === config.guilds.testing.id &&
				message.guild.id !== config.guild.id) ||
			!baseChannel ||
			baseChannel.type !== ChannelType.GuildText ||
			!/\bbots?\b/i.test(baseChannel.name)
		)
			return false;
	}

	return message.channel.id !== message.id && !message.author.bot;
}

defineButton("allowChat", allowChat);
defineButton("denyChat", denyChat);
defineMenuCommand(
	{ name: `Remove ${chatName} Response`, type: ApplicationCommandType.Message, restricted: true },
	removeResponse,
);
