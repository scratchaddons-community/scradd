import type { User } from "discord.js";
import { xpDatabase } from "../xp/util.js";
import { getLevelForXp } from "../xp/misc.js";

const timeWindow = 20;

type Message = {
	message: string;
	timestamp: number;
};
const userMessages: Record<string, Message[]> = {};
function logMessage(userId: string, message: string): void {
	const timestamp: number = Math.floor(Date.now() / 1000);
	if (!userMessages[userId]) {
		userMessages[userId] = [];
	}

	userMessages[userId]?.push({ message, timestamp });

	userMessages[userId] =
		userMessages[userId]?.filter((m) => timestamp - m.timestamp <= timeWindow) ?? [];
}

export function isSpam(user: User, message: string): boolean {
	const xp = xpDatabase.data.find((entry) => entry.user === user.id)?.xp ?? 0;
	const level = getLevelForXp(xp);
	const levelFactor = Math.min(10 * Math.log10(1 + level), 15);

	const x = Math.max(2, Math.round((5 + levelFactor) * (1 - message.length / 2000)));

	const timestamp: number = Math.floor(Date.now() / 1000);
	console.log(message.length, x, message.length / 400);
	if ((userMessages[user.id]?.length || 0) < x) {
		return false;
	}

	const recentMessages = userMessages[user.id]?.slice(-x);

	return (
		recentMessages?.every(
			(m) => m.message === message && timestamp - m.timestamp <= timeWindow,
		) || false
	);
}

export function handleMessage(user: User, message: string): boolean {
	if (isSpam(user, message)) {
		return true;
	} else {
		logMessage(user.id, message);
		return false;
	}
}
