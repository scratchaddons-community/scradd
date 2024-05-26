import type { ForumChannel, MediaChannel } from "discord.js";
import mongoose from "mongoose";
import constants from "../../common/constants.js";
import { reactAll } from "../../util/discord.js";
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
export const questions = await Question.find();

export default async function sendQuestion(channel: ForumChannel | MediaChannel): Promise<void> {
	const random = Math.floor(Math.random() * questions.length);
	const question = questions[random];
	if (!question) {
		await log(
			`${LoggingErrorEmoji} Could not find a QOTD for today! Please add new ones now.`,
			LogSeverity.Alert,
		);
		return;
	}
	if (questions.length === 1) {
		await log(
			`${LoggingErrorEmoji} No QOTDs remain! Please add new ones now.`,
			LogSeverity.Alert,
		);
	} else if (questions.length < 5) {
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
