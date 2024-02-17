import type { CustomOperation } from "../util.js";
import { Invite } from "../../roles/index.js";
import config from "../../../common/config.js";
import constants from "../../../common/constants.js";

const data: CustomOperation = {
	name: "invite",
	description: "Create a new invite link",
	async command(interaction) {
		const invite = await config.guild.invites.create(
			config.guild.rulesChannel ??
				config.channels.welcome ??
				config.channels.announcements ??
				config.channels.support,
			{ reason: "Created for " + interaction.user.tag, unique: true, maxAge: 0 },
		);
		await new Invite({
			code: invite.code,
			uses: invite.uses,
			member: interaction.user.id,
		}).save();
		await interaction.reply(
			`${constants.emojis.statuses.yes} Created invite ${invite.toString()}`,
		);
	},
};

export default data;
