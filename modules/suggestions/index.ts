import { ApplicationCommandOptionType, Snowflake } from "discord.js";
import defineCommand from "../../commands.js";
import Database from "../../common/database.js";
import getTop from "./getTop.js";

export const suggestionAnswers = [
	"Unanswered",
	"Good Idea",
	"Implemented",
	"In Development",
	"Incompatible",
	"Impractical",
	"Rejected",
	"Impossible",
] as const;

export const suggestionsDatabase = new Database<{
	answer: typeof suggestionAnswers[number];
	author: Snowflake;
	count: number;
	id: Snowflake;
	title: string | number;
}>("suggestions");
await suggestionsDatabase.init();

defineCommand(
	{
		name: "get-top-suggestions",
		description: "Get the top suggestions",

		options: {
			answer: {
				choices: Object.fromEntries(suggestionAnswers.map((answer) => [answer, answer])),
				description: "Filter suggestions to only get those with a certain answer",
				type: ApplicationCommandOptionType.String,
			},

			user: {
				description: "Filter suggestions to only get those by a certain user",
				type: ApplicationCommandOptionType.User,
			},
		},
	},
	getTop,
);
