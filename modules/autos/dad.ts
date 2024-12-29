import type { GuildMember } from "discord.js";

import { time, TimestampStyles } from "discord.js";
import { mentionChatCommand, stripMarkdown } from "strife.js";

import config from "../../common/config.ts";
import constants from "../../common/constants.ts";
import { uwuify } from "../../modules/execute/operations/uwu.ts";
import {
	customComments,
	customNames,
	customResponses,
	customTriggers,
	greetings,
	HAPPY_WORDS,
	MAX_NAME_LENGTH,
	MIN_DISCORD_AGE,
	WHOPPER_WORDS,
} from "./autos-data.ts";

let WHOPPER_COUNT = 0,
	HAPPY_COUNT = 0,
	LUCKY_COUNT = 0;

const banUser = await mentionChatCommand("ban-user", config.guild);

export default function dad(
	name: string,
	member: GuildMember,
): string | readonly (number | string)[] {
	const split = name.split(/[\b\s]+/);
	const firstName =
		split.find(
			(word) =>
				customResponses[word] ||
				customNames[word] ||
				customComments[word] ||
				customTriggers.includes(word),
		) ||
		split[0] ||
		name;
	const customName =
		customNames[firstName] ||
		(firstName === "Whopper" && WHOPPER_WORDS.at(WHOPPER_COUNT++ % WHOPPER_WORDS.length)) ||
		(name.length > MAX_NAME_LENGTH ?
			firstName.length > MAX_NAME_LENGTH ?
				"that guy with the long name"
			:	firstName
		:	name);
	const comment =
		(firstName === "Happy" &&
			`I clap along if I ${HAPPY_WORDS.at(HAPPY_COUNT++ % HAPPY_WORDS.length) ?? HAPPY_WORDS[0]}`) ||
		(firstName === "Lucky" && LUCKY_COUNT++ % 3 ?
			"I guess third time *is* the charm!"
		:	customComments[firstName] || "I’m Scradd!");

	const greetingIndex = Math.floor(Math.random() * greetings.length);
	const greeting = greetings[greetingIndex] ?? greetings[0];

	const numericalName = Number.parseFloat(firstName);

	const response =
		customResponses[firstName] ||
		(greeting === firstName &&
			{
				"Ayy": `👀 ${comment}`,
				"Greetings": undefined,
				"Hello": undefined,
				"Hey": `🐴 ${comment}`,
				"Hi": undefined,
				"Hiya": "https://tenor.com/view/bartok-gif-5086765",
				"Howdy": "You a cowboy or what?",
				"Salutations": undefined,
				"Whattup": "The ceiling",
				"Yo": `🪀 ${comment}`,
				"’Ello": undefined,
			}[greeting]) ||
		(numericalName < MIN_DISCORD_AGE &&
			`${banUser} user:${member.toString()} unban-in:${
				MIN_DISCORD_AGE - numericalName
			}yr reason:Underage; you must be ${MIN_DISCORD_AGE}yo to use Discord`) ||
		((
			[
				stripMarkdown(member.user.username).replaceAll(".", "").toLowerCase(),
				stripMarkdown(member.user.displayName).replaceAll(".", "").toLowerCase(),
			].includes(firstName.toLowerCase()) &&
			!customTriggers.includes(firstName) &&
			!customNames[firstName]
		) ?
			"<:emoji:1090372592642306048>"
		:	`${greeting}${firstName === "Nameless" ? "" : " " + customName}${
				customTriggers.includes(firstName) ? "!" : ","
			} ${comment}`);

	const date = new Date();

	switch (firstName) {
		case "In": {
			if (split[1] && name.length < MAX_NAME_LENGTH)
				return `${member.toString()} ${name.replace("In", "x")}`;
			break;
		}
		case "Miku": {
			const day = date.getUTCDay(),
				hours = date.getUTCHours(),
				minutes = date.getUTCMinutes();
			return (
				minutes === 39 ? `${constants.domains.scradd}/images/dad-miku-39.gif`
				: (day === 0 && hours > 12) || day === 1 || (day === 2 && hours < 12) ?
					`${constants.domains.scradd}/images/dad-miku-monday.mp4`
				:	"I’m thinking Miku, Miku (oo-ee-oo)"
			);
		}
		case "Captain": {
			if (greeting === "Ayy") return "I can’t hear you!";
			break;
		}
		case "Dead": {
			return `R.I.P. ${member.toString()} ${time(
				member.user.createdAt,
				TimestampStyles.ShortDate,
			)}-${time(date, TimestampStyles.ShortDate)}`;
		}
		case "Uwu": {
			return uwuify(response);
		}
		case "British": {
			return response.replaceAll(/t/gi, "’");
		}
		case "Dinnerbone":
		case "Grumm":
		case "Australian":
		case "Aussie": {
			const invertedGreetings = [
				"ʎʎ∀",
				"sƃuᴉʇǝǝɹפ",
				"ollǝH",
				"ʎǝH",
				"ᴉH",
				"ɐʎᴉH",
				"ʎpʍoH",
				"suoᴉʇɐʇnlɐS",
				"dnʇʇɐɥM",
				"o⅄",
				"ollƎ,",
			] as const;
			return `¡ppɐɹɔS ɯ,I ’${customName} ${
				invertedGreetings[greetingIndex] ?? invertedGreetings[0]
			}`;
		}
		case "Jeb_": {
			const ansiColors = [
				"\u001B[2;31m",
				"\u001B[2;35m",
				"\u001B[2;33m",
				"\u001B[2;32m",
				"\u001B[2;36m",
				"\u001B[2;34m",
			] as const;
			const { output } = [...response].reduce(
				({ output, count }, letter) => {
					if (letter === " ") return { count: count, output: output + letter };

					return {
						count: count + 1,
						output: output + ansiColors[count % ansiColors.length] + letter,
					};
				},
				{ count: 0, output: "" },
			);

			return "```ansi\n" + output + "\n```";
		}
		case "Ddarcs": {
			return [...response].toReversed().join("");
		}
		case "Mod": {
			return member.roles.resolve(config.roles.helper.id) ?
					"NOOOO DON’T BAN ME PLS"
				:	"You wish";
		}
		case "Underage": {
			return `${banUser} user:${member.toString()} reason:Underage, you must be 13yo to use Discord`;
		}
		case "Touhou": {
			const GIF_LENGTH = 9900;
			return [
				"https://i.imgur.com/GY9jpK3.gif",
				GIF_LENGTH,
				..."4F4CcRa YvISzPK JpzX2BH jvlcwsb yNMFj31 wYaj4Au OiZF25E 6Pvy2qm Iao7RMw 59d9fiq gaDJeje X7sd7mp SeKTI9S 4Q68EI7 PXiIAqn fdINYjb orQHtNN x1djAK8 vpl4SXs vebiMpJ 0NWt8Pm"
					.split(" ")
					.flatMap((image) => [`https://i.imgur.com/${image}.gif`, GIF_LENGTH] as const),
				"https://tenor.com/view/bad-apple-manu-touhou-gif-21182229",
			] as const;
		}
		case "Automodmute": {
			return `${constants.emojis.statuses.no} ${member.toString()}, language!`;
		}
	}
	return response;
}
