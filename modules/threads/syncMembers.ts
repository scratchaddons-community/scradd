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

export async function syncMembers(interaction: ChatInputCommandInteraction<"cached" | "raw">) {
	if (!interaction.channel?.isThread())
		return await interaction.reply({
			ephemeral: true,
			content: `${constants.emojis.statuses.no} This command can only be used in threads!`,
		});

	const options = getThreadConfig(interaction.channel);
	const role = interaction.options.getRole("role", true);
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
	_: GuildMember | PartialGuildMember,
	member: GuildMember,
) {
	if (member.guild.id !== config.guild.id) return;
	await Promise.all(
		threadsDatabase.data.map(async (options) => {
			const roles = options.roles && options.roles.split("|");
			if (!roles || !roles.length) return;
			const thread = await config.guild.channels.fetch(options.id).catch(() => {});
			if (!thread?.isThread()) return;
			if (roles.some((role) => member.roles.resolve(role))) {
				const baseChannel = getBaseChannel(thread);
				if (!baseChannel || baseChannel.permissionsFor(member).has("ViewChannel"))
					await thread.members.add(member, "Has qualifying role");
			} else await thread.members.remove(member.id, "Has no qualifying role");
		}),
	);
}

export async function updateThreadMembers(
	{ archived: wasArchived }: AnyThreadChannel,
	thread: AnyThreadChannel,
) {
	if (thread.guild.id === config.guild.id && wasArchived && !thread.archived) {
		const options = getThreadConfig(thread);
		await Promise.all(
			options.roles.map(async (roleId) => {
				const role = await config.guild.roles.fetch(roleId).catch(() => {});
				if (!role) return;
				return await addRoleToThread({ role, thread });
			}),
		);
	}
}

function addRoleToThread({ role, thread }: { role: Role; thread: AnyThreadChannel }) {
	return Promise.all(
		role.members.map(
			(member) =>
				(getBaseChannel(thread)?.permissionsFor(member).has("ViewChannel") ?? true) &&
				thread.members.add(member, "Has qualifying role initially"),
		),
	);
}
