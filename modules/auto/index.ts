import {
	ChannelType,
	MessageType,
	type BaseMessageOptions,
	Message,
	ApplicationCommandType,
} from "discord.js";
import { getSettings } from "../settings.js";
import { BOARD_EMOJI } from "../board/misc.js";
import config from "../../common/config.js";
import { getBaseChannel, reactAll } from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { normalize } from "../../util/text.js";
import { autoreactions, dad } from "./secrets.js";
import { client, defineButton, defineEvent, defineMenuCommand } from "strife.js";
import scratch from "./scratch.js";
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

	if (await handleMutatable(message)) {
		await learn(message);
		return;
	}
	await learn(message);

	const content = stripMarkdown(normalize(message.content.toLowerCase()));
	reactionLoop: for (const [emoji, ...requirements] of autoreactions) {
		let doReact = false;
		const emojis = [emoji].flat();
		if (emojis.some((emoji) => content.includes(emoji))) continue;

		for (const requirement of requirements) {
			const [rawMatch, type = "word"] = Array.isArray(requirement)
				? requirement
				: [requirement];
			const match = typeof rawMatch === "string" ? rawMatch : rawMatch.source;

			if (type[1] === "ping") {
				// todo: this triggers on raw id too?
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
					"i",
				).test(type === "raw" ? message.content : content);

				if (type === "negative" && result) continue reactionLoop;

				doReact ||= result;
			}
		}

		if (doReact) {
			reactions += emojis.length;
			const messageReactions = await reactAll(message, emojis);
			if (reactions > REACTION_CAP || !messageReactions) return;
		}
	}
});

defineEvent("messageUpdate", async (_, message) => {
	if (message.partial) return;

	const fetched = await message.channel.messages.fetch({ limit: 2, after: message.id });
	const found = fetched.find(
		(found) =>
			found.reference?.messageId === message.id &&
			found.author.id === client.user.id &&
			+found.createdAt - +message.createdAt < 1000,
	);

	if (fetched.size && !found) return;

	if (
		!(await handleMutatable(
			message,
			found ? (data: BaseMessageOptions) => found.edit(data) : undefined,
		))
	)
		await found?.edit({
			content: constants.zws,
			attachments: [],
			components: [],
			embeds: [],
			files: [],
		});
});

async function handleMutatable(
	message: Message,
	send = (data: BaseMessageOptions) => message.reply(data),
) {
	const chatResponse = scraddChat(message);
	if (chatResponse) {
		await send({ content: chatResponse });
		return true;
	}

	const baseChannel = getBaseChannel(message.channel);
	if (config.channels.modlogs?.id === baseChannel?.id) return false;

	const scratchData = await scratch(message);
	if (scratchData) {
		await send({ embeds: scratchData });
		return true;
	}

	if (
		message.channel.id === message.id ||
		message.channel.isDMBased() ||
		ignoreTriggers.some((trigger) => message.content.match(trigger))
	)
		return false;

	const pingsScradd = message.mentions.has(client.user, {
		ignoreEveryone: true,
		ignoreRepliedUser: true,
		ignoreRoles: true,
	});
	if (
		!pingsScradd &&
		(config.channels.info?.id === baseChannel?.id ||
			(message.guild?.id !== config.guild.id &&
				baseChannel?.type !== ChannelType.DM &&
				!baseChannel?.name.match(/\bbots?\b/i)) ||
			!(await getSettings(message.author)).autoreactions)
	)
		return false;

	const cleanContent = stripMarkdown(normalize(message.cleanContent.toLowerCase()));
	if (/^i[\p{Pi}\p{Pf}＂＇'"`՚’]?m\b/u.test(cleanContent)) {
		const name = cleanContent
			.split(
				/[\p{Ps}\p{Pe}\p{Pi}\p{Pf}𞥞𞥟𑜽،܀۔؛⁌᭟＂‽՜؟𑜼՝𑿿։꛴⁍፨"⸘‼՞᨟꛵꛳꛶•⸐!꛷𑅀,𖫵:⁃჻⁉𑅃፠⹉᙮𒑲‣⸏！⳺𐡗፣⳾𒑴⹍¡⳻𑂿，⳹𒑳〽᥄⁇𑂾､𛲟𒑱⸑𖺚፧𑽆、።፥𑇈⹓？𑽅꓾.፦𑗅߹;𑈼𖺗．፤𑗄︕¿𑈻⹌｡：𝪋⁈᥅𑅵᠂。；⵰﹗⹔𑻸᠈꓿᠄︖𑊩𑑍𖺘︓?၊𑑚᠃︔⸮။߸᠉⁏﹖𐮙︐︒;꘏𐮚︑𝪈𝪊꥟⸴﹒𝪉§⹁⸼﹕𑇞𝪇܂﹔𑇟﹐܁܆𑗏﹑꘎܇𑗐⸲܅𑗗꘍܄𑗕܉𑗖܃𑗑܈𑗓⁝𑗌⸵𑗍𑗎𑗔𑗋𑗊𑗒⸹؝𑥆𑗉…᠁︙․‥\n]+/gmu,
			)[0]
			?.split(/\s/g)
			.slice(1)
			.map((word) => (word[0] ?? "").toUpperCase() + word.slice(1).toLowerCase())
			.join(" ");

		if (
			name &&
			message.member &&
			(pingsScradd ||
				message.guild?.id !== config.guild.id ||
				config.channels.bots?.id === baseChannel?.id)
		) {
			await send({
				content: dad(name, message.member),
				allowedMentions: { users: [], repliedUser: true },
			});
			return true;
		}
	}

	return false;
}

defineEvent("messageDelete", async (message) => {
	const fetched = await message.channel.messages.fetch({ limit: 2, after: message.id });
	await fetched
		.find(
			(found) =>
				found.reference?.messageId === message.id &&
				found.author.id === client.user.id &&
				+found.createdAt - +message.createdAt < 1000,
		)
		?.delete();
});

defineButton("allowChat", allowChat);
defineButton("denyChat", denyChat);

defineMenuCommand(
	{ name: "Remove Scradd Chat Response", type: ApplicationCommandType.Message, restricted: true },
	removeResponse,
);
