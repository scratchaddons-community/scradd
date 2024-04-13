import {
	ComponentType,
	type ChatInputCommandInteraction,
	TextInputStyle,
	type ForumChannel,
	type MediaChannel,
	ButtonStyle,
	type AnySelectMenuInteraction,
	type ButtonInteraction,
	GuildMember,
	type ModalSubmitInteraction,
} from "discord.js";
import { DEFAULT_SHAPES, parseOptions } from "./misc.js";
import warn from "../punishments/warn.js";
import mongoose from "mongoose";
import tryCensor from "../automod/misc.js";
import { paginate, reactAll } from "../../util/discord.js";
import constants from "../../common/constants.js";
import { truncateText } from "../../util/text.js";
import config from "../../common/config.js";
import { ignoredDeletions } from "../logging/messages.js";
import log, { LogSeverity, LoggingErrorEmoji } from "../logging/misc.js";

export const Question = mongoose.model(
	"question",
	new mongoose.Schema({
		question: String,
		description: String,
		reactions: [String],
		_id: String,
	}),
);
const questions = await Question.find();

export default async function sendQuestion(channel: ForumChannel | MediaChannel): Promise<void> {
	const random = Math.floor(Math.random() * questions.length);
	const question = questions[random];
	if (!question) {
		await log(
			`${LoggingErrorEmoji} No QOTDs remain! Please add a new one now.`,
			LogSeverity.Alert,
		);
		return;
	}
	if (questions.length < 5) {
		await log(
			`${LoggingErrorEmoji} ${questions.length - 1} QOTD${
				questions.length === 2 ? " remains" : "s remain"
			}! Please add new ones before they run out.`,
			LogSeverity.Alert,
		);
	}

	const post = await channel.threads.create({
		name: `${question.question ?? ""} (QOTD for ${new Date().toLocaleString([], {
			month: "short",
			day: "numeric",
		})})`,
		message: { content: question.description || constants.zws },
		reason: "For today’s QOTD",
	});

	const message = await post.fetchStarterMessage();
	if (message) await reactAll(message, question.reactions);

	await question.deleteOne();
	questions.splice(random, 1);
}

export async function getQuestionData(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.showModal({
		title: "Add A Question of The Day",
		customId: "_addQuestion",
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Short,
						label: "The question to ask",
						required: true,
						customId: "question",
						maxLength: 256,
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Paragraph,
						label: `Extended description`,
						required: false,
						customId: "description",
					},
				],
			},
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.TextInput,
						style: TextInputStyle.Paragraph,
						label: `Answers (one per line; max of ${DEFAULT_SHAPES.length})`,
						placeholder: "👍 Yes\n👎 No",
						required: false,
						customId: "answers",
					},
				],
			},
			// TODO: Specify dates or ranges of dates
		],
	});
}
export async function addQuestion(interaction: ModalSubmitInteraction): Promise<void> {
	const question = interaction.fields.getTextInputValue("question").trim();
	const rawDescription = interaction.fields.fields.get("description")?.value.trim();
	const rawOptions = interaction.fields.fields.get("answers")?.value.trim() ?? "";
	const description = (rawDescription ?? "") + (rawDescription && rawOptions ? "\n\n" : "");
	const toCensor = `${question}${
		description || rawOptions ? "\n\n\n" : ""
	}${description}${rawOptions}`;
	const censored = tryCensor(toCensor);
	if (censored) {
		await warn(
			interaction.user,
			censored.words.length === 1 ? "Used a banned word" : "Used banned words",
			censored.strikes,
			`Attempted to create QOTD:\n>>> ${toCensor}`,
		);
		await interaction.reply({
			content: `${constants.emojis.statuses.no} Please ${
				censored.strikes < 1 ? "don’t say that here" : "watch your language"
			}!`,
			ephemeral: true,
		});
		return;
	}

	const { options, reactions } = parseOptions(rawOptions);
	if (options.length !== reactions.length) {
		await interaction.reply({
			content: `${constants.emojis.statuses.no} You can’t have over ${
				DEFAULT_SHAPES.length
			} option${DEFAULT_SHAPES.length === 1 ? "" : "s"}!`,
			ephemeral: true,
		});
		return;
	}

	const fullDescription = `${description}${reactions
		.map((reaction, index) => `${reaction} ${options[index] ?? ""}`)
		.join("\n")}`;
	questions.push(
		await new Question({
			question,
			description: fullDescription,
			reactions,
			_id: interaction.id,
		}).save(),
	);

	await interaction.reply({
		content: constants.emojis.statuses.yes + " Added question!",
		embeds: [{ color: constants.themeColor, title: question, description: fullDescription }],
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						customId: interaction.id + "_removeQuestion",
						type: ComponentType.Button,
						label: "Remove",
						style: ButtonStyle.Danger,
					},
				],
			},
		],
	});
}

export async function listQuestions(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.deferReply({ ephemeral: true });
	await paginate(
		questions,
		({ question }) => question ?? "",
		(data) => interaction.editReply(data),
		{
			title: "Upcoming QOTDs",
			singular: "QOTD",

			user: interaction.user,
			pageLength: 10,
			totalCount: questions.length,

			generateComponents(filtered) {
				return [
					{
						type: ComponentType.StringSelect,
						customId: "_viewQuestion",
						placeholder: "View more information on a QOTD",

						options: filtered.map((question) => ({
							label: truncateText(question.question ?? "", 100),
							description:
								question.description && truncateText(question.description, 100),
							value: question._id,
						})),
					},
				];
			},
		},
	);
}

export async function viewQuestion(interaction: AnySelectMenuInteraction): Promise<void> {
	if (
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.exec.id)
		:	interaction.member?.roles.includes(config.roles.exec.id))
	) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to view this QOTD!`,
		});
		return;
	}

	const [id] = interaction.values;
	const question = await Question.findById(id).exec();
	await interaction.reply(
		question ?
			{
				ephemeral: true,
				embeds: [
					{
						color: constants.themeColor,
						title: question.question,
						description: question.description,
					},
				],
				components: [
					{
						type: ComponentType.ActionRow,
						components: [
							{
								customId: question.id + "_removeQuestion",
								type: ComponentType.Button,
								label: "Remove",
								style: ButtonStyle.Danger,
							},
							// TODO: edit?
						],
					},
				],
			}
		:	{
				ephemeral: true,
				content: `${constants.emojis.statuses.no} Could not find that QOTD! Was it deleted?`,
			},
	);
}

export async function removeQuestion(interaction: ButtonInteraction, id = ""): Promise<void> {
	if (
		!(interaction.member instanceof GuildMember ?
			interaction.member.roles.resolve(config.roles.exec.id)
		:	interaction.member?.roles.includes(config.roles.exec.id))
	) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You don’t have permission to remove this QOTD!`,
		});
		return;
	}

	const message = await interaction.reply({
		fetchReply: true,
		content: "🗑 Are you sure you want to remove this QOTD?",
		embeds: interaction.message.flags.has("Ephemeral") ? interaction.message.embeds : [],
		components: [
			{
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.Button,
						label: "Delete",
						style: ButtonStyle.Danger,
						customId: "confirm",
					},
					{
						type: ComponentType.Button,
						label: "Cancel",
						customId: "cancel",
						style: ButtonStyle.Secondary,
					},
				],
			},
		],
	});
	message
		.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter: (buttonInteraction) => interaction.user.id === buttonInteraction.user.id,
			max: 1,
			time: constants.collectorTime,
		})
		.on("collect", async (buttonInteraction) => {
			if (buttonInteraction.customId === "cancel") {
				ignoredDeletions.add(message.id);
				await message.delete();
			} else {
				await Question.findByIdAndDelete(id).exec();

				const index = questions.findIndex((question) => question._id === id);
				if (index > -1) questions.splice(index, 1);

				await message.edit({
					content: `${constants.emojis.statuses.yes} Removed QOTD!`,
					components: [],
				});
			}

			await buttonInteraction.deferUpdate();
		});

	return;
}
