import {
	type APIEmbed,
	ButtonStyle,
	ChannelType,
	ComponentType,
	type Embed,
	type GuildAuditLogsEntry,
	type TextBasedChannel,
	type TextChannel,
	ThreadAutoArchiveDuration,
	type AuditLogEvent,
	type APIAuditLogChange,
	type GuildEmoji,
	type Snowflake,
	type Base,
	type AnyThreadChannel,
	type ApplicationCommand,
	type AutoModerationRule,
	type Guild,
	type GuildScheduledEvent,
	type Integration,
	type Invite,
	type Role,
	type StageInstance,
	type Sticker,
	type User,
	type Webhook,
	type NonThreadGuildBasedChannel,
	type Message,
	type ThreadChannel,
} from "discord.js";
import { getBaseChannel } from "../../util/discord.js";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import type { actualPrimitives } from "mongoose";

export function shouldLog(channel: TextBasedChannel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	return Boolean(
		baseChannel?.type !== ChannelType.DM &&
			baseChannel?.guild.id === config.guild.id &&
			baseChannel.permissionsFor(config.roles.staff ?? config.guild.id)?.has("ViewChannel"),
	);
}

export enum LogSeverity {
	/**
	 * Critical alerts that require actions in response. All mods should read this channel, preferably with notifications on.
	 *
	 * - Failed actions.
	 * - Bot errors.
	 * - Likely spammer detected.
	 * - Ticket opened.
	 * - Message reported by member.
	 *
	 * Discord also logs some things here:
	 *
	 * - AutoMod triggered.
	 * - Community update messages.
	 * - Raid alerts.
	 */
	Alert,
	/**
	 * Updates that are important to know or not easily noticeable otherwise. All mods should read.
	 *
	 * - Channel created/deleted/converted.
	 * - Expressions changed.
	 * - Roles list changed.
	 * - Integrations changed.
	 * - Server identity changed.
	 * - Thread deleted.
	 * - User punished.
	 *
	 * @todo - When migrating, the `members` thread should become this to keep warn messages all in the same thread.
	 */
	ImportantUpdate,
	/**
	 * Change to server settings or other changes affecting the whole server. All mods should skim.
	 *
	 * - `/say` used.
	 * - Permissions changed.
	 * - Channel settings changed.
	 * - Message pinned/published.
	 * - Thread closed/locked.
	 * - Member server profile edited.
	 * - Events scheduled/edited.
	 */
	ServerChange,
	/**
	 * Generally unimportant changes to server content. Optional to read.
	 *
	 * - Message edited/deleted.
	 * - Messages purged.
	 * - Reactions purged.
	 * - Thread settings updated.
	 */
	ContentEdit,
	/**
	 * Logged as a resource for possible future reference. Optional to join the thread.
	 *
	 * - User global profile changed.
	 * - Member joined/left.
	 * - Invites created/deleted.
	 * - Voice channel state changed.
	 */
	Resource,
}

export default async function log(
	content: `${LoggingEmojis | typeof LoggingErrorEmoji} ${string}`,
	group: LogSeverity | TextChannel,
	extra: {
		embeds?: (APIEmbed | Embed | undefined)[];
		files?: (string | { extension?: string; content: string })[];
		buttons?: ({ label: string } & (
			| { customId: string; style: Exclude<ButtonStyle, ButtonStyle.Link> }
			| { url: string }
		))[];
	} = {},
): Promise<Message<true>> {
	const thread = typeof group === "object" ? group : await getLoggingThread(group);

	const { external, embedded } = extra.files?.reduce<{
		external: (string | { extension?: string; content: string })[];
		embedded: { extension?: string | undefined; content: string }[];
	}>(
		(accumulator, file) => {
			if (typeof file === "string" || file.content.includes("```")) {
				return {
					embedded: accumulator.embedded,
					external: [...accumulator.external, file],
				};
			}

			const lines = file.content.split("\n");
			return lines.length > 10 || lines.some((line) => line.length > 100)
				? { embedded: accumulator.embedded, external: [...accumulator.external, file] }
				: { embedded: [...accumulator.embedded, file], external: accumulator.external };
		},
		{ external: [], embedded: [] },
	) ?? { external: [], embedded: [] };

	return await thread.send({
		content:
			content +
			(embedded.length
				? embedded
						.map((file) => `\n\`\`\`${file.extension || ""}\n${file.content}\n\`\`\``)
						.join("")
				: ""),
		allowedMentions: { users: [] },
		embeds: extra.embeds?.filter(Boolean),
		components: extra.buttons && [
			{
				components: extra.buttons.map((button) => ({
					style: ButtonStyle.Link,
					...button,
					type: ComponentType.Button,
				})),
				type: ComponentType.ActionRow,
			},
		],
		files: await Promise.all(
			external.map(async (file) => {
				if (typeof file === "string") {
					const response = await fetch(file);
					return {
						attachment: Buffer.from(await response.arrayBuffer()),
						name: new URL(file).pathname.split("/").at(-1),
					};
				}

				return {
					attachment: Buffer.from(file.content, "utf8"),
					name: `file.${file.extension || "txt"}`,
				};
			}),
		),
	});
}

export async function getLoggingThread(group: LogSeverity): Promise<TextChannel | ThreadChannel> {
	if (!config.channels.modlogs) throw new ReferenceError("Cannot find logs channel");
	if (group === LogSeverity.Alert) return config.channels.modlogs;

	const name = `${group}) ${LogSeverity[group]
		.replaceAll(/([a-z])([A-Z])/g, "$1 $2")
		.toLowerCase()}s`;

	return (
		(await config.channels.modlogs.threads.fetch()).threads.find(
			(thread) => thread.name === name,
		) ??
		(await config.channels.modlogs.threads.create({
			name,
			reason: "New logging thread",
			autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
		}))
	);
}

export enum LoggingEmojis {
	SettingChange = "📋",
	Channel = "🗄",
	Punishment = "🔨",
	Role = "🏷",
	Integration = "🖇",
	Thread = "📂",
	ServerUpdate = "✨",
	Voice = "🔊",
	Expressions = "😳",
	User = "👤",
	Event = "🗓",
	Invite = "👋",
	MessageUpdate = "🌐",
	MessageEdit = "📝",
	Bot = "🤖",
	MessageDelete = "🗑",
	Member = "👥",
}

export const LoggingErrorEmoji = constants.emojis.statuses.no;

export function extraAuditLogsInfo(entry: {
	executor?: User | null;
	reason?: string | null;
}): string {
	const reason = entry.reason?.trim();
	return `${entry.executor ? ` by ${entry.executor.toString()}` : ""}${
		reason ? (reason.includes("\n") ? `:\n${reason}` : ` (${reason})`) : ""
	}`;
}

export type AuditLogTargets<Type extends AuditLogEvent> = Type extends
	| AuditLogEvent.ThreadCreate
	| AuditLogEvent.ThreadDelete
	| AuditLogEvent.ThreadUpdate
	? AnyThreadChannel | { id: Snowflake }
	: Type extends AuditLogEvent.ApplicationCommandPermissionUpdate
	? ApplicationCommand | { id: Snowflake }
	: Type extends
			| AuditLogEvent.AutoModerationBlockMessage
			| AuditLogEvent.AutoModerationFlagToChannel
			| AuditLogEvent.AutoModerationRuleCreate
			| AuditLogEvent.AutoModerationRuleDelete
			| AuditLogEvent.AutoModerationRuleUpdate
			| AuditLogEvent.AutoModerationUserCommunicationDisabled
	? AutoModerationRule
	: Type extends
			| AuditLogEvent.IntegrationCreate
			| AuditLogEvent.IntegrationDelete
			| AuditLogEvent.IntegrationUpdate
	? Integration
	: Type extends
			| AuditLogEvent.InviteCreate
			| AuditLogEvent.InviteDelete
			| AuditLogEvent.InviteUpdate
	? Invite
	: Type extends AuditLogEvent.GuildUpdate
	? Guild
	: Type extends AuditLogEvent.MessageBulkDelete
	? Guild | { id: Snowflake }
	: Type extends AuditLogEvent.EmojiCreate | AuditLogEvent.EmojiDelete | AuditLogEvent.EmojiUpdate
	? GuildEmoji | { id: Snowflake }
	: Type extends
			| AuditLogEvent.GuildScheduledEventCreate
			| AuditLogEvent.GuildScheduledEventDelete
			| AuditLogEvent.GuildScheduledEventUpdate
	? GuildScheduledEvent
	: Type extends
			| AuditLogEvent.ChannelCreate
			| AuditLogEvent.ChannelDelete
			| AuditLogEvent.ChannelOverwriteCreate
			| AuditLogEvent.ChannelOverwriteDelete
			| AuditLogEvent.ChannelOverwriteUpdate
			| AuditLogEvent.ChannelUpdate
	? NonThreadGuildBasedChannel | { id: Snowflake }
	: Type extends AuditLogEvent.RoleCreate | AuditLogEvent.RoleDelete | AuditLogEvent.RoleUpdate
	? Role | { id: Snowflake }
	: Type extends
			| AuditLogEvent.StageInstanceCreate
			| AuditLogEvent.StageInstanceDelete
			| AuditLogEvent.StageInstanceUpdate
	? StageInstance
	: Type extends
			| AuditLogEvent.StickerCreate
			| AuditLogEvent.StickerDelete
			| AuditLogEvent.StickerUpdate
	? Sticker
	: Type extends
			| AuditLogEvent.MessageDelete
			| AuditLogEvent.MessagePin
			| AuditLogEvent.MessageUnpin
	? User
	: Type extends
			| AuditLogEvent.BotAdd
			| AuditLogEvent.MemberBanAdd
			| AuditLogEvent.MemberBanRemove
			| AuditLogEvent.MemberDisconnect
			| AuditLogEvent.MemberKick
			| AuditLogEvent.MemberMove
			| AuditLogEvent.MemberPrune
			| AuditLogEvent.MemberRoleUpdate
			| AuditLogEvent.MemberUpdate
	? User | null
	: Type extends
			| AuditLogEvent.WebhookCreate
			| AuditLogEvent.WebhookDelete
			| AuditLogEvent.WebhookUpdate
	? Webhook
	: { id: Snowflake } | null;
export type AuditLog<
	Event extends AuditLogEvent,
	ExtraChangeKeys extends string = never,
	Target = AuditLogTargets<Event>,
	AllKeys extends string =
		| ExtraChangeKeys
		| Extract<
				APIAuditLogChange["key"],
				Extract<Target, Base> extends never ? string : keyof Extract<Target, Base>
		  >,
> = Omit<GuildAuditLogsEntry<Event>, "changes" | "target"> & {
	target: Target;
	changes: {
		[Key in AllKeys]: {
			key: Key;
			old?: ChangeValue<Extract<Target, Base>, Key, "old">;
			new?: ChangeValue<Extract<Target, Base>, Key, "new">;
		};
	}[AllKeys][];
};

type ChangeValue<
	Target extends Base,
	Key extends string,
	Type extends "new" | "old",
> = Key extends keyof Target
	? Target[Key] extends actualPrimitives
		? Target[Key] | undefined
		: Change<Key>[`${Type}_value`] | Target[Key]
	: Change<Key>[`${Type}_value`];

type Change<Key extends string> = Extract<APIAuditLogChange, { key: Key }> extends never
	? APIAuditLogChange
	: Extract<APIAuditLogChange, { key: Key }>;
