import constants from "../../common/constants.js";
import { reactAll } from "../../util/discord.js";
import tryCensor from "../automod/misc.js";
import warn from "../punishments/warn.js";
import type { ModalSubmitInteraction } from "discord.js";
import { DEFAULT_SHAPES, parseOptions } from "./misc.js";

export default async function poll(
	interaction: ModalSubmitInteraction,
	voteMode: string,
): Promise<undefined> {
	const question = interaction.fields.getTextInputValue("question");
	const rawOptions = interaction.fields.getTextInputValue("options");
	const censored = tryCensor(`${question}\n\n${rawOptions}`);
	if (censored) {
		await warn(
			interaction.user,
			censored.words.length === 1 ? "Used a banned word" : "Used banned words",
			censored.strikes,
			`Attempted to create poll with options:\n>>> ${rawOptions}`,
		);
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} Please ${
				censored.strikes < 1 ? "don’t say that here" : "watch your language"
			}!`,
		});
		return;
	}

	const { options, reactions } = parseOptions(rawOptions);
	if (options.length !== reactions.length) {
		await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} You can’t have over ${
				DEFAULT_SHAPES.length
			} option${DEFAULT_SHAPES.length === 1 ? "" : "s"}!`,
		});
		return;
	}

	const message = await interaction.reply({
		embeds: [
			{
				color: constants.themeColor,
				title: interaction.fields.getTextInputValue("question"),
				description: reactions
					.map((reaction, index) => `${reaction} ${options[index] ?? ""}`)
					.join("\n"),
				footer:
					voteMode === "1" ? { text: "You can only vote once on this poll." } : undefined,
			},
		],
		fetchReply: true,
	});
	await reactAll(message, reactions);
}
