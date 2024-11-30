import type { ForumChannel, ForumThreadChannel, MediaChannel } from "discord.js";

import mongoose from "mongoose";
import { reactAll, zeroWidthSpace } from "strife.js";

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

export default async function sendQuestion(
	channel: ForumChannel | MediaChannel,
): Promise<ForumThreadChannel | undefined> {
	const random = Math.floor(Math.random() * questions.length);
	const question = questions[random];
	if (!question) return;

	const post = await channel.threads.create({
		name: `${question.question ?? ""} (QOTD for ${new Date().toLocaleString([], {
			month: "short",
			day: "numeric",
		})})`,
		message: { content: question.description || zeroWidthSpace },
		reason: "For today’s QOTD",
	});

	const message = await post.fetchStarterMessage();
	if (message) await reactAll(message, question.reactions);

	await question.deleteOne();
	questions.splice(random, 1);
	return post;
}
