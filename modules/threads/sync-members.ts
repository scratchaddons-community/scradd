import type {
	AnyThreadChannel,
	ChatInputCommandInteraction,
	GuildMember,
	InteractionResponse,
	PartialGuildMember,
	Role,
} from "discord.js";

import { Collection } from "discord.js";
import { getBaseChannel } from "strife.js";

import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { getThreadConfig, threadsDatabase } from "./misc.js";

export async function syncMembers(
	interaction: ChatInputCommandInteraction<"cached" | "raw">,
	{ role }: { role: Role },
): Promise<InteractionResponse | undefined> {
	if (!interaction.channel?.isThread())
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} This command can only be used in threads!`,
		});

	const threadConfig = getThreadConfig(interaction.channel);
	if (threadConfig.roles.includes(role.id)) {
		threadsDatabase.updateById(
			{
				id: interaction.channel.id,
				roles: threadConfig.roles.filter((found) => found !== role.id).join("|"),
			},
			{ keepOpen: threadConfig.keepOpen },
		);
		return await interaction.reply(
			`${constants.emojis.statuses.yes} I will no longer add all ${role.toString()} to this thread!`,
		);
	}

	threadsDatabase.updateById(
		{ id: interaction.channel.id, roles: [...threadConfig.roles, role.id].join("|") },
		{ keepOpen: threadConfig.keepOpen },
	);
	await interaction.reply(
		`${constants.emojis.statuses.yes} I will add all ${role.toString()} to this thread!`,
	);

	await addRoleToThread({ role, thread: interaction.channel });
}

export async function updateMemberThreads(
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
): Promise<void> {
	for (const options of threadsDatabase.data) {
		const roles = options.roles?.split("|");
		if (!roles?.length) continue;

		const qualifies = roles.some((role) => newMember.roles.resolve(role));
		if (!oldMember.partial) {
			const qualified = roles.some((role) => oldMember.roles.resolve(role));
			if (qualified === qualifies) continue;
		}

		const thread = await config.guild.channels.fetch(options.id).catch(() => void 0);
		if (!thread?.isThread()) continue;

		const baseChannel = getBaseChannel(thread);

		if (qualifies && baseChannel?.permissionsFor(newMember).has("ViewChannel")) {
			await thread.members.add(newMember, "Has qualifying role");
			continue;
		}
		await thread.members.remove(newMember, "Has no qualifying role");
	}
}

export async function updateThreadMembers(
	{ archived: wasArchived }: AnyThreadChannel,
	thread: AnyThreadChannel,
): Promise<void> {
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

async function addRoleToThread({
	role,
	thread,
}: {
	role: Role;
	thread: AnyThreadChannel;
}): Promise<void> {
	if (!(role.members instanceof Collection)) {
		throw new TypeError("role.members is not a Collection!", { cause: role });
	}
	for (const [, member] of role.members) {
		const baseChannel = getBaseChannel(thread);
		if (!baseChannel || baseChannel.permissionsFor(member).has("ViewChannel"))
			await thread.members.add(member, "Has qualifying role initially");
	}
}
