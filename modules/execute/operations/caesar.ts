import type { CustomOperation } from "../util.ts";

import assert from "node:assert";

import { ApplicationCommandOptionType } from "discord.js";

import { caesar } from "../../../util/text.ts";

const data: CustomOperation = {
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
};

export default data;
