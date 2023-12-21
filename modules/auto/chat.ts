import {
	type Snowflake,
	Message,
	MessageType,
	ChannelType,
	ComponentType,
	ButtonStyle,
	ButtonInteraction,
} from "discord.js";
import { normalize } from "../../util/text.js";
import { stripMarkdown } from "../../util/markdown.js";
import tryCensor from "../automod/language.js";
import { client } from "strife.js";
import didYouMean, { ReturnTypeEnums, ThresholdTypeEnums } from "didyoumean2";
import {
	GlobalBotInvitesPattern,
	GlobalUsersPattern,
	InvitesPattern,
	getBaseChannel,
	messageToText,
} from "../../util/discord.js";
import { getSettings, userSettingsDatabase } from "../settings.js";
import constants from "../../common/constants.js";
import config, { getInitialChannelThreads } from "../../common/config.js";
import mongoose from "mongoose";

const Chats = mongoose.model("Chat", new mongoose.Schema({ prompt: String, response: String }));
const dictionary = (await Chats.find({}))
	.map((chat) => ({ response: chat.response, prompt: chat.prompt }))
	.filter(
		(chat): chat is { response: string; prompt: string | undefined } =>
			!!(chat.response && !tryCensor(chat.response)),
	)
	.toSorted(() => Math.random() - 0.5);
const thread = await getThread();
let LAST_SENT = 0;
export default function scraddChat(message: Message) {
	if (
		message.author.id === client.user.id ||
		message.channel.id !== thread?.id ||
		Date.now() - LAST_SENT < 1000 ||
		(message.mentions.users.size > 0 && !message.mentions.has(client.user))
	)
		return;
	const prompt = stripMarkdown(normalize(messageToText(message, false).toLowerCase()));

	const responses = didYouMean(prompt, dictionary, {
		matchPath: ["prompt"],
		returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES,
		thresholdType: ThresholdTypeEnums.SIMILARITY,
		threshold: 0.5,
	});
	const response = responses[Math.floor(Math.random() * responses.length)]?.response;
	if (!response || response === prompt) return;

	LAST_SENT = Date.now();
	return response;
}

const previousMessages: Record<Snowflake, Message> = {};
export async function learn(message: Message) {
	const previous = previousMessages[message.channel.id];
	previousMessages[message.channel.id] = message;

	if (message.author.id === client.user.id || !(await getSettings(message.author)).scraddChat)
		return;

	const baseChannel = getBaseChannel(message.channel);
	if (
		message.channel.type === ChannelType.PrivateThread ||
		baseChannel?.type === ChannelType.DM ||
		!baseChannel?.permissionsFor(baseChannel.guild.id)?.has("ViewChannel")
	)
		return;

	const response = messageToText(message, false).replaceAll(
		GlobalUsersPattern,
		client.user.toString(),
	);
	if (
		!response ||
		response.length > 500 ||
		response.split("\n").length > 5 ||
		response.match(InvitesPattern)?.length ||
		response.match(GlobalBotInvitesPattern)?.length
	)
		return;

	const reference =
		message.type === MessageType.Reply
			? await message.fetchReference().catch(() => void 0)
			: previous;
	const prompt =
		reference &&
		stripMarkdown(normalize(messageToText(reference, false).toLowerCase())).replaceAll(
			GlobalUsersPattern,
			client.user.toString(),
		);

	if (reference?.author.id === message.author.id || prompt === undefined || prompt === response)
		return;
	dictionary.push({ prompt, response });
	await new Chats({ prompt, response }).save();
}

async function getThread() {
	if (!config.channels.bots) return;

	const intitialThread = getInitialChannelThreads(config.channels.bots).find(
		(thread) => thread.name === "Scradd Chat",
	);
	if (intitialThread) return intitialThread;

	const createdThread = await config.channels.bots.threads.create({
		name: "Scradd Chat",
		reason: "For Scradd Chat",
	});
	const message = await createdThread.send({
		content:
			"## Scradd Chat\n### Basic regurgitating chatbot\nScradd Chat learns by tracking messages across all channels. Your messages will only be stored if you give express permission by selecting a button below. You will be able to change your decision at any time, however any past messages can’t be deleted, as message authors are not stored. By default, your messages are not saved. If you consent to these terms, you may select the appropriate button below.",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: "_allowChat",
						type: ComponentType.Button,
						label: "Store my messages",
						style: ButtonStyle.Success,
					},
					{
						customId: "_denyChat",
						type: ComponentType.Button,
						label: "Don’t store my messages",
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	});
	await message.pin();
	return createdThread;
}
export async function allowChat(interaction: ButtonInteraction) {
	const settings = await getSettings(interaction.user);
	if (settings.scraddChat) {
		return await interaction.reply(
			`${
				constants.emojis.statuses.yes
			} ${interaction.user.toString()}, your mesages will continue to be saved in all public channels.`,
		);
	}

	userSettingsDatabase.updateById({ id: interaction.user.id, scraddChat: true }, settings);
	await interaction.reply(
		`${
			constants.emojis.statuses.yes
		} ${interaction.user.toString()}, your messages will be saved in all public channels. If you ever reverse this decision, messages can’t be retroactively removed. If you disagree with these terms, please select the appropriate button on [this message](<${
			interaction.message.url
		}>).`,
	);
}
export async function denyChat(interaction: ButtonInteraction) {
	const settings = await getSettings(interaction.user);
	if (!settings.scraddChat) {
		return await interaction.reply(
			`${
				constants.emojis.statuses.yes
			} ${interaction.user.toString()}, your mesages will continue to not be saved.`,
		);
	}

	userSettingsDatabase.updateById({ id: interaction.user.id, scraddChat: false }, settings);
	await interaction.reply(
		`${
			constants.emojis.statuses.yes
		} ${interaction.user.toString()}, your messages will no longer be saved. Remember that any past messages will not be retroactively removed.`,
	);
}

// TODO: removing responses
