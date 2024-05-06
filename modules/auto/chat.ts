import didYouMean, { ReturnTypeEnums, ThresholdTypeEnums } from "didyoumean2";
import {
	ButtonStyle,
	ChannelType,
	ComponentType,
	MessageType,
	TextInputStyle,
	type ButtonInteraction,
	type InteractionResponse,
	type Message,
	type MessageContextMenuCommandInteraction,
	type Snowflake,
	type ThreadChannel,
} from "discord.js";
import mongoose from "mongoose";
import { client } from "strife.js";
import config, { getInitialChannelThreads } from "../../common/config.js";
import constants from "../../common/constants.js";
import {
	GlobalBotInvitesPattern,
	GlobalUsersPattern,
	InvitesPattern,
	getBaseChannel,
	messageToText,
} from "../../util/discord.js";
import { stripMarkdown } from "../../util/markdown.js";
import { normalize } from "../../util/text.js";
import tryCensor, { censor } from "../automod/misc.js";
import log, { LogSeverity, LoggingEmojis } from "../logging/misc.js";
import { getSettings, userSettingsDatabase } from "../settings.js";

export const chatName = `${client.user.displayName} Chat` as const;

const Chat = mongoose.model("Chat", new mongoose.Schema({ prompt: String, response: String }));
const chats = (await Chat.find({}))
	.map((chat) => ({ response: chat.response, prompt: chat.prompt ?? "" }))
	.filter(
		(chat): chat is { response: string; prompt: string } =>
			!!(chat.response && !tryCensor(chat.response)),
	);

export default function scraddChat(message: Message): string | undefined {
	if (
		message.author.id === client.user.id ||
		message.channel.id !== chatThread?.id ||
		(!message.mentions.has(client.user) &&
			message.mentions.users.size > (message.mentions.has(message.author) ? 1 : 0))
	)
		return;
	const prompt = stripMarkdown(normalize(messageToText(message, false).toLowerCase())).replaceAll(
		GlobalUsersPattern,
		client.user.toString(),
	);

	const { response } = getResponse(prompt, 0.9)?.[0] ??
		getResponse(prompt, 0.75)?.[0] ??
		getResponse(prompt, 0.45)?.[0] ?? { response: undefined, prompt };
	if (!response) return;
	return censor(response)
		.replaceAll(client.user.toString(), message.author.toString())
		.replaceAll("<@0>", client.user.toString());
}

function getResponse(
	prompt: string,
	threshold: number,
): { response: string; prompt: string }[] | undefined {
	const responses = didYouMean(
		prompt,
		chats.filter(
			({ response }) => response && response !== prompt && !removedResponses.has(response),
		),
		{
			matchPath: ["prompt"],
			returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES,
			thresholdType: ThresholdTypeEnums.SIMILARITY,
			threshold,
		},
	).toSorted(() => Math.random() - 0.5);
	return responses;
}

const previousMessages: Record<Snowflake, Message> = {};
export async function learn(message: Message): Promise<void> {
	if (message.channel.id === chatThread?.id) return;

	const previous = previousMessages[message.channel.id];
	previousMessages[message.channel.id] = message;

	if (
		[message.author.id, previous?.author.id].includes(client.user.id) ||
		!(await getSettings(message.author)).scraddChat
	)
		return;

	const baseChannel = getBaseChannel(message.channel);
	if (
		message.channel.type === ChannelType.PrivateThread ||
		baseChannel?.type === ChannelType.DM ||
		!baseChannel?.permissionsFor(baseChannel.guild.id)?.has("ViewChannel")
	)
		return;

	const response = messageToText(message, false)
		.replaceAll(message.author.toString(), "<@0>")
		.replaceAll(GlobalUsersPattern, client.user.toString());
	if (
		!response ||
		response.length > 500 ||
		response.split("\n").length > 5 ||
		response.match(InvitesPattern)?.length ||
		response.match(GlobalBotInvitesPattern)?.length
	)
		return;

	const reference =
		message.type === MessageType.Reply ?
			await message.fetchReference().catch(() => void 0)
		:	previous;
	const prompt =
		reference &&
		stripMarkdown(normalize(messageToText(reference, false).toLowerCase())).replaceAll(
			GlobalUsersPattern,
			client.user.toString(),
		);

	if (reference?.author.id === message.author.id || prompt === undefined || prompt === response)
		return;
	chats.push({ prompt, response });
	await new Chat({ prompt, response }).save();
}

export const chatThread = await getThread();
async function getThread(): Promise<ThreadChannel | undefined> {
	if (!config.channels.bots) return;

	const intitialThread = getInitialChannelThreads(config.channels.bots).find(({ name }) =>
		name.startsWith(chatName),
	);
	if (intitialThread) return intitialThread;

	const createdThread = await config.channels.bots.threads.create({
		name: `${chatName} (Check pins!)`,
		reason: `For ${chatName}`,
	});
	const message = await createdThread.send({
		content: `## ${chatName}\n### Basic regurgitating chatbot\n${chatName} learns by tracking messages across all channels. Your messages will only be stored if you give explicit permission by selecting a button below. You will be able to change your decision at any time, however any past messages can’t be deleted, as message authors are not stored. By default, your messages are not saved. If you consent to these terms, you may select the appropriate button below.`,
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
	await message.pin(`Pinned ${chatName} consent message for ease of access`);
	return createdThread;
}
export async function allowChat(
	interaction: ButtonInteraction,
): Promise<InteractionResponse | undefined> {
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
export async function denyChat(
	interaction: ButtonInteraction,
): Promise<InteractionResponse | undefined> {
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

const removedResponses = new Set<string>();
export async function removeResponse(
	interaction: MessageContextMenuCommandInteraction,
): Promise<InteractionResponse | undefined> {
	await interaction.showModal({
		title: "Confirm Permament Response Removal",
		customId: interaction.id,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Short,
						label: "Please confirm to remove this response",
						required: true,
						customId: "confirm",
						placeholder: "Type anything in this box to confirm. This is irreversible.",
					},
				],
			},
		],
	});

	const modalInteraction = await interaction
		.awaitModalSubmit({
			time: constants.collectorTime,
			filter: (modalInteraction) => modalInteraction.customId === interaction.id,
		})
		.catch(() => void 0);

	if (!modalInteraction) return;
	await modalInteraction.deferReply({ ephemeral: true });

	const response = interaction.targetMessage.content
		.replaceAll(client.user.toString(), "<@0>")
		.replaceAll(interaction.targetMessage.author.toString(), client.user.toString());
	removedResponses.add(response);

	const { deletedCount } = await Chat.deleteMany({ response }).exec();
	if (!deletedCount) {
		await modalInteraction.editReply(
			`${constants.emojis.statuses.no} Could not find that as a response to any prompt!`,
		);
		return;
	}

	await log(
		`${
			LoggingEmojis.Bot
		} ${interaction.user.toString()} permamently removed a response from ${chatName} (${deletedCount} prompt${
			deletedCount === 1 ? "" : "s"
		})`,
		LogSeverity.ImportantUpdate,
		{ files: [{ content: response, extension: "md" }] },
	);
	await interaction.targetMessage.delete();
	await modalInteraction.editReply(
		`${
			constants.emojis.statuses.yes
		} Permamently removed response. That response was associated with ${deletedCount} prompt${
			deletedCount === 1 ? "" : "s"
		}.`,
	);
}
