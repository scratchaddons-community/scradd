import constants from "../../../common/constants.js";
import type { CustomOperation } from "../util.js";
import { GuildMember } from "discord.js";

const data: CustomOperation = {
	name: "russian-roulette",
	description: "Gives a 1/6 change to mute you for an hour",
	async command(interaction) {
		if (
			interaction.member instanceof GuildMember &&
			interaction.member.moderatable &&
			Math.random() < 1 / 6
		) {
			await interaction.reply("🔫 Bang! You’ve been muted for an hour.");
			await interaction.member.disableCommunicationUntil(
				Date.now() + 60 * 60 * 1000,
				"Lost russian roulette",
			);
		} else {
			await interaction.reply(
				`${constants.emojis.statuses.yes} Click! You’re safe… for now.`,
			);
		}
	},
};

export default data;
