import type { CustomOperation } from "../util.ts";

import { client, getBaseChannel } from "strife.js";

import config from "../../../common/config.ts";
import constants from "../../../common/constants.ts";
import { asyncFilter } from "../../../util/promises.ts";
import { Invite } from "../../roles/index.ts";

const data: CustomOperation = {
	name: "invite",
	description: "Create a personal invite link",
	async command(interaction) {
		const uses =
			(
				await Invite.aggregate<{ _id: null; totalUses: number }>([
					{ $match: { member: interaction.user.id } },
					{ $group: { _id: null, totalUses: { $sum: "$uses" } } },
				]).exec()
			)[0]?.totalUses ?? 0;

		const channel =
			config.guild.rulesChannel ??
			config.channels.welcome ??
			config.channels.announcements ??
			config.channels.support ??
			getBaseChannel(interaction.channel);
		if (!channel) throw new ReferenceError("Could not find a channel to direct the invite to");

		const invites = await config.guild.invites.fetch({ channelId: channel });
		const existing = await asyncFilter([...invites.values()], async (invite) => {
			if (invite.guildScheduledEvent || invite.targetType !== null) return false;
			if (invite.maxUses !== 0 || invite.maxAge !== 0) return false;
			if (invite.temporary !== false) return false;

			if (invite.inviter?.id === interaction.user.id) return invite;

			if (invite.inviter?.id !== client.user.id) return false;
			if (await Invite.exists({ code: invite.code, member: interaction.user.id }))
				return invite;
			return false;
		}).next();

		if (existing.value) {
			await interaction.reply({
				content: `${
					constants.emojis.statuses.no
				} You already have a personal invite created! ${existing.value.toString()}\nYou have invited **${
					uses
				} ${uses === 1 ? "person" : "people"}** to this server so far.`,
				ephemeral: true,
			});
			return;
		}

		const invite = await config.guild.invites.create(channel, {
			reason: "Created for " + interaction.user.tag,
			unique: true,
			maxAge: 0,
		});
		await new Invite({
			code: invite.code,
			uses: invite.uses,
			member: interaction.user.id,
		}).save();
		await interaction.reply({
			content: `${
				constants.emojis.statuses.yes
			} Created personal invite! ${invite.toString()}\nYou have invited **${uses} ${
				uses === 1 ? "person" : "people"
			}** to this server so far.`,
			ephemeral: true,
		});
	},
};

export default data;
