import {
	ComponentType,
	type ChatInputCommandInteraction,
	TextInputStyle,
	type ForumChannel,
	type MediaChannel,
} from "discord.js";
import { DEFAULT_SHAPES, parseOptions } from "./misc.js";
import warn from "../punishments/warn.js";
import mongoose from "mongoose";
import tryCensor from "../automod/misc.js";
import { paginate, reactAll } from "../../util/discord.js";
import constants from "../../common/constants.js";

export const Question = mongoose.model(
	"question",
	new mongoose.Schema({ question: String, description: String, reactions: [String] }),
);

export default async function sendQuestion(channel: ForumChannel | MediaChannel): Promise<void> {
	const questions = await Question.find(); // TODO: Use a global cache like Scratch Chat does

	const random = Math.floor(Math.random() * questions.length);
	const question = questions[random];
	if (!question) return;

	const post = await channel.threads.create({
		name: `${question.question ?? ""} (QOTD for ${new Date().toLocaleString([], {
			month: "short",
			day: "numeric",
		})})`,
		message: { content: question.description ?? constants.zws },
		reason: "For today’s QOTD",
	});

	const message = await post.fetchStarterMessage();
	if (message) await reactAll(message, question.reactions);

	await question.deleteOne();
}

export async function addQuestion(interaction: ChatInputCommandInteraction): Promise<void> {
	await interaction.showModal({
		title: "Add A Question of The Day",
		customId: interaction.id,
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
						label: `Extended description (optional)`,
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
						customId: "answers",
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

	const question = modalInteraction.fields.getTextInputValue("question").trim();
	const rawDescription = modalInteraction.fields.fields.get("description")?.value.trim();
	const rawOptions = modalInteraction.fields.fields.get("options")?.value.trim() ?? "";
	const description = (rawDescription ?? "") + (rawDescription && rawOptions ? "\n\n" : "");
	const data = `${question}${
		description || rawOptions ? "\n\n\n" : ""
	}${description}${rawOptions}`;
	const censored = tryCensor(data);
	if (censored) {
		await warn(
			interaction.user,
			censored.words.length === 1 ? "Used a banned word" : "Used banned words",
			censored.strikes,
			`Attempted to create QOTD:\n>>> ${data}`,
		);
		await modalInteraction.reply({
			content: `${constants.emojis.statuses.no} Please ${
				censored.strikes < 1 ? "don’t say that here" : "watch your language"
			}!`,
			ephemeral: true,
		});
		return;
	}

	const { options, reactions } = parseOptions(rawOptions);
	if (options.length !== reactions.length) {
		await modalInteraction.reply({
			content: `${constants.emojis.statuses.no} You can’t have over ${
				DEFAULT_SHAPES.length
			} option${DEFAULT_SHAPES.length === 1 ? "" : "s"}!`,
			ephemeral: true,
		});
		return;
	}

	await new Question({
		question,
		description:
			description +
			reactions.map((reaction, index) => `${reaction} ${options[index] ?? ""}`).join("\n"),
		reactions,
	}).save();

	await modalInteraction.reply({
		content: constants.emojis.statuses.yes + " Added question!",
		embeds: [{ title: question, description }],
		// TODO: Remove & Edit buttons
	});
}

export async function listQuestions(interaction: ChatInputCommandInteraction): Promise<void> {
	const questions = await Question.find();
	await paginate(
		questions,
		({ question }) => question ?? "",
		(data) => interaction.reply(data),
		{
			title: "Upcoming QOTDs.",
			singular: "QOTD",

			user: interaction.user,
			ephemeral: true,
			pageLength: 10,
			// TODO: More Info menus
		},
	);
}
