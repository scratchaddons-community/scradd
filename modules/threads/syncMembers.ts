import {
	Role,
	type AnyThreadChannel,
	GuildMember,
	type PartialGuildMember,
	ChatInputCommandInteraction,
	roleMention,
} from "discord.js";
import constants from "../../common/constants.js";
import { getThreadConfig, threadsDatabase } from "./misc.js";
import config from "../../common/config.js";
import { getBaseChannel } from "../../util/discord.js";

export async function syncMembers(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	{ role }: { role: Role },
) {
	if (!interaction.channel?.isThread())
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} This command can only be used in threads!`,
		});

	const options = getThreadConfig(interaction.channel);
	const roles = options.roles;
	if (roles.includes(role.id)) {
		threadsDatabase.updateById(
			{
				id: interaction.channel.id,
				roles: roles.filter((found) => found !== role.id).join("|"),
			},
			options,
		);
		return await interaction.reply(
			`${constants.emojis.statuses.yes} I will no longer add all ${roleMention(
				role.id,
			)} to this thread! (note that *I* will not remove them)`,
		);
	}

	threadsDatabase.updateById(
		{ id: interaction.channel.id, roles: [...roles, role.id].join("|") },
		options,
	);
	await interaction.reply(
		`${constants.emojis.statuses.yes} I will add all ${roleMention(role.id)} to this thread!`,
	);

	if (role instanceof Role) await addRoleToThread({ role, thread: interaction.channel });
}

export async function updateMemberThreads(
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
) {
	for (const options of threadsDatabase.data) {
		const roles = options.roles && options.roles.split("|");
		if (!roles || !roles.length) continue;

		const qualifies = roles.some((role) => newMember.roles.resolve(role));
		if (!oldMember.partial) {
			const qualified = roles.some((role) => oldMember.roles.resolve(role));
			if (qualified === qualifies) continue;
		}

		const thread = await config.guild.channels.fetch(options.id).catch(() => void 0);
		if (!thread?.isThread()) continue;

		const baseChannel = getBaseChannel(thread);

		await (qualifies && baseChannel?.permissionsFor(newMember).has("ViewChannel")
			? thread.members.add(newMember, "Has qualifying role")
			: thread.members.remove(newMember, "Has no qualifying role"));
	}
}

export async function updateThreadMembers(
	{ archived: wasArchived }: AnyThreadChannel,
	thread: AnyThreadChannel,
) {
	if (thread.guild.id === config.guild.id && wasArchived && !thread.archived) {
		const options = getThreadConfig(thread);
		for (const roleId of options.roles) {
			const role = await config.guild.roles.fetch(roleId).catch(() => void 0);
			if (!role) continue;
			await addRoleToThread({ role, thread });
			continue;
		}
	}
}

async function addRoleToThread({ role, thread }: { role: Role; thread: AnyThreadChannel }) {
	for (const [, member] of role.members) {
		const baseChannel = getBaseChannel(thread);
		if (!baseChannel || baseChannel.permissionsFor(member).has("ViewChannel"))
			await thread.members.add(member, "Has qualifying role initially");
	}
}
