import { userMention, type Snowflake } from "discord.js";
import config from "../../common/config.js";

const MESSAGE_HEADER = "## Pending Rounds";

const { threads } = (await config.channels.mod?.threads.fetch()) ?? {};
export const tourneyThread = threads?.find(
	({ name }) => name === "Memory Match Tournament management",
);

export async function playNeeded(ids: [Snowflake, Snowflake]) {
	const match = await getMatch(ids);
	if (!match) return false;

	const [, , oneWon = 0, twoWon = 0] = match;
	return !(Number(oneWon) > 1 || Number(twoWon) > 1);
}

export async function logGame({
	winner,
	loser,
	url,
}: {
	winner: Snowflake;
	loser: Snowflake;
	url: string;
}) {
	const message = await getMessage();
	const match = await getMatch([winner, loser]);
	if (!message || !match) return false;

	if (winner === match[0]) match[2] = String(Number(match[2]) + 1);
	else match[3] = String(Number(match[3]) + 1);

	const matches = await getMatches();
	const newMatches = matches
		.map((players) => {
			const newMatch =
				players?.includes(winner) && players?.includes(loser) ? match : players ?? [];
			return `${userMention(newMatch[0] ?? "")}v${userMention(newMatch[1] ?? "")} ${
				newMatch[2]
			}-${newMatch[3]}`;
		})
		.join("\n");
	await message.edit(`${MESSAGE_HEADER}\n${newMatches}`);

	await message.channel.send({
		allowedMentions: {},
		content: `🎲 ${userMention(winner)} beat ${userMention(loser)} - ${url}`,
	});
	return true;
}

/** `[idOne, idTwo, oneWon, twoWon][]` */
async function getMatch(ids: [Snowflake, Snowflake]) {
	const matches = await getMatches();
	return matches.find((players) => players?.includes(ids[0]) && players?.includes(ids[1]));
}

async function getMatches() {
	const message = await getMessage();
	if (!message) return [];

	return message.content
		.split("\n")
		.slice(1)
		.map((line) => line.match(/^<@(\d+)>v<@(\d+)> (\d)-(\d)$/)?.slice(1));
}

async function getMessage() {
	const pins = await tourneyThread?.messages.fetchPinned();
	return pins?.find(({ content }) => content.startsWith(MESSAGE_HEADER));
}
