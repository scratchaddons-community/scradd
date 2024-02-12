import {
	ApplicationCommandPermissionType,
	GuildMember,
	PermissionsBitField,
	User,
	ApplicationCommand,
	type GuildResolvable,
	type APIInteractionGuildMember,
	type Snowflake,
	type TextBasedChannel,
	type ApplicationCommandPermissions,
	type ApplicationCommandPermissionsUpdateData,
	type Guild,
} from "discord.js";
import type { CustomOperation } from "./util.js";
import { client } from "strife.js";

const permissionsCache: Record<
	Guild["id"],
	Record<ApplicationCommand["id"], ApplicationCommandPermissions[] | undefined> | undefined
> = {};
export default async function hasPermission(
	schema: ApplicationCommand<{ guild?: GuildResolvable | null }> | CustomOperation,
	user: GuildMember | User | (APIInteractionGuildMember & { id: Snowflake }),
	channel?: TextBasedChannel,
	ignoredRoles = new Set<Snowflake>(),
) {
	if (!(schema instanceof ApplicationCommand)) return true; // TODO
	if (user instanceof User) return schema.dmPermission ?? false;

	const memberPermissions =
		user instanceof GuildMember
			? user.permissions
			: new PermissionsBitField(BigInt(user.permissions));
	if (memberPermissions.has("Administrator")) return true;

	const guild = user instanceof GuildMember ? user.guild : undefined;
	const permissions =
		permissionsCache[guild?.id ?? ""]?.[schema.id] ??
		(await schema.permissions.fetch({ guild }).catch(() => []));
	(permissionsCache[guild?.id ?? ""] ??= {})[schema.id] ??= permissions;

	const channelPermission =
		!channel ||
		(permissions.find(
			({ id, type }) =>
				type === ApplicationCommandPermissionType.Channel && id === channel.id,
		)?.permission ??
			true);
	if (!channelPermission) return false;

	const userPermission =
		permissions.find(
			({ id, type }) => type === ApplicationCommandPermissionType.User && id === user.id,
		)?.permission ?? true;
	if (!userPermission) return false;

	const rolePermissions = permissions.filter(
		({ id, type }) =>
			type === ApplicationCommandPermissionType.Role &&
			!ignoredRoles.has(id) &&
			(user instanceof GuildMember ? user.roles.resolve(id) : user.roles.includes(id)),
	);
	return rolePermissions.length
		? rolePermissions.some(({ permission }) => permission)
		: memberPermissions.has(
				schema.defaultMemberPermissions?.equals(0n)
					? "Administrator"
					: schema.defaultMemberPermissions ?? 0n,
		  );
}

export function handleCommandPermissionUpdate(data: ApplicationCommandPermissionsUpdateData) {
	if (data.applicationId === client.user.id) permissionsCache[data.guildId] = {};
}
