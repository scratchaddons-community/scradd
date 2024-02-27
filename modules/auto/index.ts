import {
	ChannelType,
	MessageType,
	type PartialMessage,
	type Message,
	ApplicationCommandType,
	type Snowflake,
	type APIEmbed,
	ComponentType,
	ButtonStyle,
	type BaseMessageOptions,
} from "discord.js";
import { getSettings } from "../settings.js";
import { BOARD_EMOJI } from "../board/misc.js";
import config from "../../common/config.js";
import { getBaseChannel, reactAll } from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { normalize } from "../../util/text.js";
import { autoreactions, dad } from "./secrets.js";
import { client, defineButton, defineEvent, defineMenuCommand } from "strife.js";
import { getMatches, handleMatch } from "./scratch.js";
import constants from "../../common/constants.js";
import scraddChat, { allowChat, denyChat, learn, removeResponse } from "./chat.js";

const REACTION_CAP = 3;

const ignoreTriggers = [
	/\bkill/i,
	/\bsuicid/i,
	/\bdepress/i,
	/\bpain/i,
	/\bsick/i,
	/\babus/i,
	/\bkms/i,
	/\bkys/i,
	/\bbleed/i,
];

defineEvent("messageCreate", async (message) => {
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

	const response = await handleMutatable(message);
	if (response) {
		if (response === true) return;
		const isArray = Array.isArray(response);
		if (!isArray) await message.reply(response);
		else if (typeof response[0] === "object") {
			const reply = await message.reply(response[0]);
			for (const action of response.slice(1)) {
				if (typeof action === "number") {
					await new Promise((resolve) => setTimeout(resolve, action));
					continue;
				}

				const edited = await reply.edit(action).catch(() => void 0);
				if (!edited) break;
			}
		}
		await learn(message);
		return;
	}
	await learn(message);

	const settings = await getSettings(message.author);
	if (!settings.autoreactions || !canDoSecrets(message)) return;
	const content = stripMarkdown(normalize(message.content.toLowerCase()));
	reactionLoop: for (const [rawEmojis, ...requirements] of autoreactions) {
		let doReact = false;
		const emojis = [rawEmojis].flat();
		if (emojis.some((emoji) => content.includes(emoji))) continue;

		for (const requirement of requirements) {
			const [rawMatch, type = "word"] = Array.isArray(requirement)
				? requirement
				: [requirement];
			const match = typeof rawMatch === "string" ? rawMatch : rawMatch.source;

			if (type[1] === "ping") {
				doReact ||= message.mentions.has(match, {
					ignoreEveryone: true,
					ignoreRoles: true,
				});
			} else {
				const result = new RegExp(
					type === "partial" || type === "raw"
						? match
						: `${type === "full" ? "^" : "\\b"}${match}${
								type === "plural" ? "(?:e?s)?" : ""
						  }${type === "full" ? "$" : "\\b"}`,
					"iu",
				).test(type === "raw" ? message.content : content);

				if (type === "negative" && result) continue reactionLoop;

				doReact ||= result;
			}
		}

		if (doReact) {
			reactions += emojis.length;
			const messageReactions = await reactAll(message, emojis);
			if (reactions > REACTION_CAP || !messageReactions.length) return;
		}
	}
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const found = await getAutoResponse(message);
	if (found === false) return;

	const response = await handleMutatable(message);
	const data = typeof response === "object" && !Array.isArray(response) && response;
	if (found)
		await found.edit(data || { content: constants.zws, components: [], embeds: [], files: [] });
	else if (data) await message.reply(data);
});

async function handleMutatable(
	message: Message,
): Promise<(BaseMessageOptions | number | string)[] | BaseMessageOptions | true | undefined> {
	const baseChannel = getBaseChannel(message.channel);
	if (config.channels.modlogs?.id === baseChannel?.id) return;

	const settings = await getSettings(message.author);
	if (settings.scratchEmbeds) {
		const notSet = (await getSettings(message.author, false)).scratchEmbeds === undefined;

		const matches = getMatches(message.content);
		const embeds: APIEmbed[] = [];
		for (const match of matches) {
			const embed = await handleMatch(match);
			if (embed) {
				embeds.push(embed);
				if (!notSet) embed.footer = { text: "Disable this using /settings" };
			}
			if (embeds.length >= 5) break;
		}
		if (embeds.length)
			return {
				content: "",
				files: [],
				embeds,
				components: notSet
					? [
							{
								components: [
									{
										customId: "scratchEmbeds_toggleSetting",
										type: ComponentType.Button as const,
										label: `Disable Scratch Embeds`,
										style: ButtonStyle.Success as const,
									},
								],
								type: ComponentType.ActionRow,
							},
					  ]
					: [],
			};
	}

	const ignored = ignoreTriggers.some((trigger) => message.content.match(trigger));
	if (ignored) return true;

	const chatResponse = scraddChat(message);
	if (chatResponse) return { content: chatResponse, files: [], embeds: [], components: [] };

	if (!canDoSecrets(message, true)) return;

	const cleanContent = stripMarkdown(normalize(message.cleanContent.toLowerCase()));
	if (/^i[\p{Pi}\p{Pf}＂＇'"`՚’]?m\b/u.test(cleanContent)) {
		const name = cleanContent
			.split(
				/[\p{Ps}\p{Pe}\p{Pi}\p{Pf}𞥞𞥟𑜽،܀۔؛⁌᭟＂‽՜؟𑜼՝𑿿։꛴⁍፨"⸘‼՞᨟꛵꛳꛶•⸐!꛷𑅀,𖫵:⁃჻⁉𑅃፠⹉᙮𒑲‣⸏！⳺𐡗፣⳾𒑴⹍¡⳻𑂿，⳹𒑳〽᥄⁇𑂾､𛲟𒑱⸑𖺚፧𑽆、።፥𑇈⹓？𑽅꓾.፦𑗅߹;𑈼𖺗．፤𑗄︕¿𑈻⹌｡：𝪋⁈᥅𑅵᠂。；⵰﹗⹔𑻸᠈꓿᠄︖𑊩𑑍𖺘︓?၊𑑚᠃︔⸮။߸᠉⁏﹖𐮙︐︒;꘏𐮚︑𝪈𝪊꥟⸴﹒𝪉§⹁⸼﹕𑇞𝪇܂﹔𑇟﹐܁܆𑗏﹑꘎܇𑗐⸲܅𑗗꘍܄𑗕܉𑗖܃𑗑܈𑗓⁝𑗌⸵𑗍𑗎𑗔𑗋𑗊𑗒⸹؝𑥆𑗉…᠁︙․‥\n]+/gmu,
			)[0]
			.split(/\s/g)
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		if (name && message.member) {
			const response = dad(name, message.member);
			return Array.isArray(response)
				? [
						{
							content: response[0],
							files: [],
							embeds: [],
							components: [],
							allowedMentions: { users: [], repliedUser: true },
						},
						...response.slice(1),
				  ]
				: {
						content: response,
						files: [],
						embeds: [],
						components: [],
						allowedMentions: { users: [], repliedUser: true },
				  };
		}
	}
}

defineEvent("messageDelete", async (message) => {
	const found = await getAutoResponse(message);
	if (!found) return;

	await found.delete();
	autoResponses.delete(found.id);
});

const autoResponses = new Map<Snowflake, Message>();
async function getAutoResponse(
	message: Message | PartialMessage,
): Promise<Message | false | undefined> {
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
			(message.guild?.id === config.testingGuild?.id &&
				message.guild?.id !== config.guild.id) ||
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
	{ name: "Remove Scradd Chat Response", type: ApplicationCommandType.Message, restricted: true },
	removeResponse,
);
