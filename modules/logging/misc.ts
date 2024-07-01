import {
	ButtonStyle,
	ComponentType,
	ThreadAutoArchiveDuration,
	type APIAuditLogChange,
	type APIEmbed,
	type AnyThreadChannel,
	type ApplicationCommand,
	type AuditLogEvent,
	type AutoModerationRule,
	type Base,
	type Channel,
	type Embed,
	type Guild,
	type GuildAuditLogsEntry,
	type GuildEmoji,
	type GuildScheduledEvent,
	type Integration,
	type Invite,
	type Message,
	type NonThreadGuildBasedChannel,
	type Role,
	type Snowflake,
	type StageInstance,
	type Sticker,
	type TextChannel,
	type ThreadChannel,
	type User,
	type Webhook,
} from "discord.js";
import type { actualPrimitives } from "mongoose";
import config from "../../common/config.js";
import constants from "../../common/constants.js";
import { getBaseChannel } from "../../util/discord.js";
import features from "../../common/features.js";

export function shouldLog(channel: Channel | null): boolean {
	const baseChannel = getBaseChannel(channel);

	if (!baseChannel) return true;
	if (baseChannel.isDMBased()) return false;
	if (baseChannel.guild.id !== config.guild.id) return false;
	return baseChannel.permissionsFor(config.roles.staff).has("ViewChannel");
}

export enum LogSeverity {
	/**
	 * Critical alerts that require actions in response. All mods should read this channel, preferably with
	 * notifications on.
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

let lastPing = 0;

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
		pingHere?: boolean;
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
			return lines.length > 10 || lines.some((line) => line.length > 100) ?
					{ embedded: accumulator.embedded, external: [...accumulator.external, file] }
				:	{ embedded: [...accumulator.embedded, file], external: accumulator.external };
		},
		{ external: [], embedded: [] },
	) ?? { external: [], embedded: [] };

	const shouldPing =
		extra.pingHere && features.ticketsPingForReports && Date.now() - lastPing > 90_000;
	if (shouldPing) lastPing = Date.now();

	return await thread.send({
		content:
			content +
			(shouldPing ? `${content.includes("\n") ? "\n" : " "}@here` : "") +
			(embedded.length ?
				embedded
					.map((file) => `\n\`\`\`${file.extension || ""}\n${file.content}\n\`\`\``)
					.join("")
			:	""),
		allowedMentions: { users: [], parse: shouldPing ? ["everyone"] : undefined },
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
	Expression = "😳",
	User = "👤",
	// eslint-disable-next-line @typescript-eslint/no-shadow
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
		reason?.includes("\n") ? `:\n${reason}`
		: reason ? ` (${reason})`
		: ""
	}`;
}

export type AuditLogTargets<Type extends AuditLogEvent> =
	Type extends (
		AuditLogEvent.ThreadCreate | AuditLogEvent.ThreadDelete | AuditLogEvent.ThreadUpdate
	) ?
		AnyThreadChannel | { id: Snowflake }
	: Type extends AuditLogEvent.ApplicationCommandPermissionUpdate ?
		ApplicationCommand | { id: Snowflake }
	: Type extends (
		| AuditLogEvent.AutoModerationBlockMessage
		| AuditLogEvent.AutoModerationFlagToChannel
		| AuditLogEvent.AutoModerationRuleCreate
		| AuditLogEvent.AutoModerationRuleDelete
		| AuditLogEvent.AutoModerationRuleUpdate
		| AuditLogEvent.AutoModerationUserCommunicationDisabled
	) ?
		AutoModerationRule
	: Type extends (
		| AuditLogEvent.IntegrationCreate
		| AuditLogEvent.IntegrationDelete
		| AuditLogEvent.IntegrationUpdate
	) ?
		Integration
	: Type extends (
		AuditLogEvent.InviteCreate | AuditLogEvent.InviteDelete | AuditLogEvent.InviteUpdate
	) ?
		Invite
	: Type extends AuditLogEvent.GuildUpdate ? Guild
	: Type extends AuditLogEvent.MessageBulkDelete ? Guild | { id: Snowflake }
	: Type extends (
		AuditLogEvent.EmojiCreate | AuditLogEvent.EmojiDelete | AuditLogEvent.EmojiUpdate
	) ?
		GuildEmoji | { id: Snowflake }
	: Type extends (
		| AuditLogEvent.GuildScheduledEventCreate
		| AuditLogEvent.GuildScheduledEventDelete
		| AuditLogEvent.GuildScheduledEventUpdate
	) ?
		GuildScheduledEvent
	: Type extends (
		| AuditLogEvent.ChannelCreate
		| AuditLogEvent.ChannelDelete
		| AuditLogEvent.ChannelOverwriteCreate
		| AuditLogEvent.ChannelOverwriteDelete
		| AuditLogEvent.ChannelOverwriteUpdate
		| AuditLogEvent.ChannelUpdate
	) ?
		NonThreadGuildBasedChannel | { id: Snowflake }
	: Type extends AuditLogEvent.RoleCreate | AuditLogEvent.RoleDelete | AuditLogEvent.RoleUpdate ?
		Role | { id: Snowflake }
	: Type extends (
		| AuditLogEvent.StageInstanceCreate
		| AuditLogEvent.StageInstanceDelete
		| AuditLogEvent.StageInstanceUpdate
	) ?
		StageInstance
	: Type extends (
		AuditLogEvent.StickerCreate | AuditLogEvent.StickerDelete | AuditLogEvent.StickerUpdate
	) ?
		Sticker
	: Type extends (
		AuditLogEvent.MessageDelete | AuditLogEvent.MessagePin | AuditLogEvent.MessageUnpin
	) ?
		User
	: Type extends (
		| AuditLogEvent.BotAdd
		| AuditLogEvent.MemberBanAdd
		| AuditLogEvent.MemberBanRemove
		| AuditLogEvent.MemberDisconnect
		| AuditLogEvent.MemberKick
		| AuditLogEvent.MemberMove
		| AuditLogEvent.MemberPrune
		| AuditLogEvent.MemberRoleUpdate
		| AuditLogEvent.MemberUpdate
	) ?
		User | null
	: Type extends (
		AuditLogEvent.WebhookCreate | AuditLogEvent.WebhookDelete | AuditLogEvent.WebhookUpdate
	) ?
		Webhook
	:	{ id: Snowflake } | null;
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

type ChangeValue<Target extends Base, Key extends string, Type extends "new" | "old"> =
	Key extends keyof Target ?
		Target[Key] extends actualPrimitives ?
			Target[Key] | undefined
		:	Change<Key>[`${Type}_value`] | Target[Key]
	:	Change<Key>[`${Type}_value`];

type Change<Key extends string> =
	Extract<APIAuditLogChange, { key: Key }> extends never ? APIAuditLogChange
	:	Extract<APIAuditLogChange, { key: Key }>;
