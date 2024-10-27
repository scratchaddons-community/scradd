import type { CustomOperation } from "../util.js";

import assert from "node:assert";

import { ApplicationCommandOptionType } from "discord.js";

import features from "../../../common/features.js";
import { caesar } from "../../../util/text.js";

const data: CustomOperation | undefined =
	features.executeCaesar ?
		{
			name: "caesar",
			description: "Encode a message using the Caesar cipher.",
			censored: "channel",
			options: [
				{
					type: ApplicationCommandOptionType.String,
					name: "text",
					description: "The text to encode",
					required: true,
					maxLength: 1000,
				},
				{
					type: ApplicationCommandOptionType.Integer,
					name: "shift",
					description: "The shift to encode with (defaults to 13)",
					required: false,
					minValue: 0,
					maxValue: 26,
				},
			],
			async command(interaction, { text, shift }) {
				assert(typeof text === "string");

				await interaction.reply(caesar(text, typeof shift === "number" ? shift : 13));
			},
		}
	:	undefined;

export default data;
