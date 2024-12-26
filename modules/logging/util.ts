import type {
	APIAuditLogChange,
	AuditLogEvent,
	Base,
	GuildAuditLogsEntry,
	PartialUser,
	User,
} from "discord.js";
import type { actualPrimitives } from "mongoose";
import type { CamelToKebab } from "../../util/text.ts";

import constants from "../../common/constants.ts";

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

export const enum LoggingEmojis {
	SettingChange = "📋",
	Channel = "🗄️",
	Punishment = "🔨",
	Role = "🏷️",
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

export const LoggingEmojisError = constants.emojis.statuses.no;

export function extraAuditLogsInfo(entry: {
	executor?: User | PartialUser | null;
	reason?: string | null;
}): string {
	const reason = entry.reason?.trim();
	return `${entry.executor ? ` by ${entry.executor.toString()}` : ""}${
		reason?.includes("\n") ? `:\n${reason}`
		: reason ? ` (${reason})`
		: ""
	}`;
}

export type AuditLog<
	Event extends AuditLogEvent,
	ExtraChangeKeys extends string = never,
	Target = GuildAuditLogsEntry<Event>["target"],
	AllKeys extends string =
		| ExtraChangeKeys
		| Extract<
				APIAuditLogChange["key"],
				Extract<Target, Base> extends never ? string
				:	CamelToKebab<Extract<keyof Extract<Target, Base>, string>, "_">
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
