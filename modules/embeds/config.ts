import type { ChatInputCommandInteraction } from "discord.js";

import assert from "node:assert";

import { channelMention } from "discord.js";
import mongoose from "mongoose";

import constants from "../../common/constants.ts";

export const EmbedConfig = mongoose.model(
	"EmbedConfig",
	new mongoose.Schema({
		guild: { type: String, required: true },
		enabled: { type: Boolean, default: true },
		channels: { type: Map, of: Boolean, default: {} },
	}),
);

export default async function configEmbeds(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	{ setting }: { setting?: "on-channel" | "off-channel" | "server" },
): Promise<void> {
	assert(interaction.guild);
	assert(interaction.channel);

	const config = await EmbedConfig.findOneAndUpdate(
		{ guild: interaction.guild.id },
		{},
		{ new: true, upsert: true, setDefaultsOnInsert: true },
	).exec();
	switch (setting) {
		case "server": {
			config.enabled = !config.enabled;
			break;
		}
		case "on-channel": {
			config.channels.set(interaction.channel.id, false);
			break;
		}
		case "off-channel": {
			config.channels.set(interaction.channel.id, true);
			break;
		}
		case undefined: {
			break;
		}
	}
	await config.save();

	await interaction.reply({
		embeds: [
			{
				title: "Scratch Embeds Settings",
				color: constants.themeColor,
				description: `**Enabled**: ${constants.emojis.statuses[config.enabled ? "yes" : "no"]}\n\n${
					config.channels.size ? `**Channel Overrides**:\n` : "No channel overrides"
				}${Array.from(
					config.channels.entries(),
					([channel, status]) =>
						`${channelMention(channel)}: ${constants.emojis.statuses[status ? "yes" : "no"]}`,
				).join("\n")}`,
			},
		],
	});
}
