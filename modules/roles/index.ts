import config from "../../common/config.js";
import { defineChatCommand, defineEvent, defineModal } from "strife.js";
import constants from "../../common/constants.js";
import { persistedLeave, persistedRejoin } from "./persisted.js";
import { createCustomRole, recheckMemberRole, recheckAllRoles, customRole } from "./custom.js";
import mongoose from "mongoose";

export const Invite = mongoose.model(
	"Invite",
	new mongoose.Schema({ code: String, member: String, uses: Number }),
);

defineEvent("inviteDelete", async (invite) => {
	if (!invite.uses) return;
	await Invite.findOneAndUpdate(
		{ code: invite.code },
		{
			uses: invite.uses,
			...(invite.inviter && !invite.inviter.bot && { member: invite.inviter.id }),
		},
		{ upsert: true },
	).exec();
});
defineEvent("guildMemberAdd", async () => {
	for (const [, invite] of await config.guild.invites.fetch()) {
		if (!invite.uses) continue;
		await Invite.findOneAndUpdate(
			{ code: invite.code },
			{
				uses: invite.uses,
				...(invite.inviter && !invite.inviter.bot && { member: invite.inviter.id }),
			},
			{ upsert: true },
		).exec();
	}

	const inviters = await Invite.aggregate<{ _id: string; totalUses: number }>([
		{ $group: { _id: "$member", totalUses: { $sum: "$uses" } } },
		{ $match: { totalUses: { $gte: 20 } } },
	]).exec();
	for (const invite of inviters) {
		const inviter = await config.guild.members.fetch(invite._id).catch(() => void 0);
		if (
			!inviter ||
			inviter.id === constants.users.hans ||
			inviter.user.bot ||
			!config.roles.epic ||
			inviter.roles.resolve(config.roles.epic.id)
		)
			return;
		await inviter.roles.add(config.roles.epic, "Invited 20+ people");
		await config.channels.general?.send(
			`🎊 ${inviter.toString()} Thanks for inviting 20+ people! Here’s ${config.roles.epic.toString()} as a thank-you.`,
		);
	}
});

defineEvent("guildMemberRemove", persistedLeave);
defineEvent("guildMemberAdd", persistedRejoin);

defineEvent.pre("guildMemberUpdate", async (_, member) => {
	if (member.guild.id !== config.guild.id) return false;

	if (member.roles.premiumSubscriberRole && config.roles.booster)
		await member.roles.add(config.roles.booster, "Boosted the server");

	return true;
});

defineChatCommand(
	{ name: "custom-role", description: "Create a custom role for yourself", restricted: true },
	customRole,
);
defineModal("customRole", createCustomRole);
defineEvent("guildMemberRemove", recheckAllRoles);
defineEvent("guildMemberUpdate", recheckMemberRole);
defineEvent("applicationCommandPermissionsUpdate", recheckAllRoles);
