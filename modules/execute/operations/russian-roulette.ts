import { GuildMember } from "discord.js";
import { setTimeout as wait } from "node:timers/promises";
import constants from "../../../common/constants.js";
import type { CustomOperation } from "../util.js";

const data: CustomOperation = {
	name: "russian-roulette",
	description: "Gives a 1/6 change to mute you for an hour",
	async command(interaction) {
		await interaction.reply(`${constants.emojis.misc.loading} Spinning the cylinder…`);
		await wait(2000);
		if (
			interaction.member instanceof GuildMember &&
			interaction.member.moderatable &&
			Math.random() < 1 / 6
		) {
			await interaction.editReply("🔫 Bang! You’ve been muted for an hour.");
			await interaction.member.disableCommunicationUntil(
				Date.now() + 60 * 60 * 1000,
				"Lost russian roulette",
			);
		} else {
			await interaction.editReply(
				`${constants.emojis.statuses.yes} Click! You’re safe… for now.`,
			);
		}
	},
};

export default data;
