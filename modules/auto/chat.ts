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
import { censor } from "../automod/language.js";
import { client } from "strife.js";
import { matchSorter } from "match-sorter";
import {
	GlobalBotInvitesPattern,
	InvitesPattern,
	getBaseChannel,
	messageToText,
} from "../../util/discord.js";
import { getSettings, userSettingsDatabase } from "../settings.js";
import constants from "../../common/constants.js";
import config, { getInitialChannelThreads } from "../../common/config.js";

const previousMessages: Record<
	Snowflake,
	{ content: string; author: Snowflake } | { content?: never; author?: never }
> = {};
const dictionary: { prompt: string; responses: string[] }[] = [];
const thread = await getThread();
let LAST_SENT = 0;
export default function scraddChat(message: Message) {
	const input = stripMarkdown(normalize(messageToText(message, false).toLowerCase()));
	previousMessages[message.channel.id] = { content: input, author: message.author.id };

	if (
		message.author.id === client.user.id ||
		message.channel.id !== thread?.id ||
		Date.now() - LAST_SENT < 1000 ||
		(message.mentions.users.size > 0 && !message.mentions.has(client.user))
	)
		return;

	const answers = matchSorter(dictionary, input, { keys: ["prompt"] })[0]?.responses;
	if (answers?.[0]) {
		LAST_SENT = Date.now();

		return censor(answers[Math.floor(Math.random() * answers.length)] ?? answers[0]);
	}
}
export async function learn(message: Message) {
	const previous = previousMessages[message.channel.id];
	if (
		[client.user.id, previous?.author].includes(message.author.id) ||
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

	const response = messageToText(message, false);
	if (
		response.length > 500 ||
		response.split("\n").length > 5 ||
		response.match(InvitesPattern)?.length ||
		response.match(GlobalBotInvitesPattern)?.length
	)
		return;

	const reply =
		message.type === MessageType.Reply && (await message.fetchReference().catch(() => void 0));
	const prompt =
		reply == false
			? previous?.content
			: reply && stripMarkdown(normalize(messageToText(reply, false).toLowerCase()));
	if (prompt === undefined || prompt === response) return;

	const oldEntry = dictionary.findIndex((entry) => entry.prompt === prompt);
	dictionary[oldEntry]?.responses.push(response) ??
		dictionary.push({ prompt, responses: [response] });
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
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.yes} Your mesages will continue to be saved in all public channels.`,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
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
	}

	userSettingsDatabase.updateById({ id: interaction.user.id, scraddChat: true }, settings);
	await interaction.reply({
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Your messages will be saved in all public channels. If you ever reverse this decision, messages can’t be retroactively removed. If you disagree with these terms, please select the button below.`,
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
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
}
export async function denyChat(interaction: ButtonInteraction) {
	const settings = await getSettings(interaction.user);
	if (!settings.scraddChat) {
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.yes} Your mesages will continue to not be saved.`,
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
					],
				},
			],
		});
	}

	userSettingsDatabase.updateById({ id: interaction.user.id, scraddChat: false }, settings);
	await interaction.reply({
		ephemeral: true,
		content: `${constants.emojis.statuses.yes} Your messages will no longer be saved. Remember that any past messages will not be retroactively removed.`,
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
				],
			},
		],
	});
}

// TODO: mongo
// TODO: removing responses
