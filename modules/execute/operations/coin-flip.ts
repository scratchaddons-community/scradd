import type { CustomOperation } from "../util.ts";

import { setTimeout as wait } from "node:timers/promises";

import constants from "../../../common/constants.ts";
import features from "../../../common/features.ts";

const data: CustomOperation | undefined =
	features.executeCoinFlip ?
		{
			name: "coin-flip",
			description: "Flips a coin",
			async command(interaction) {
				await interaction.reply(`${constants.emojis.misc.coinflip} Flipping a coin…`);
				await wait(2000);
				await interaction.editReply(
					Math.random() > 0.5 ?
						`${constants.emojis.misc.heads} It’s heads!`
					:	"🪙 It’s tails!",
				);
			},
		}
	:	undefined;

export default data;
