import type { CustomOperation } from "../util.ts";

import { getSettings, userSettingsDatabase } from "../../settings.ts";

const data: CustomOperation = {
	name: "dango-farm",
	description: "Dango Farm",
	async command(interaction) {
		userSettingsDatabase.updateById(
			{ id: interaction.user.id, dangoFarm: true },
			await getSettings(interaction.user),
		);
		await interaction.reply({
			content: "https://tenor.com/view/clannad-dango-hana-yori-anime-gif-18112357",
			ephemeral: true,
		});
	},
};

export default data;
